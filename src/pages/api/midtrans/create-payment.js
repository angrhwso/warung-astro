import { supabaseAdmin } from '../../../lib/supabase'
import { sendAdminWhatsappNotification } from '../../../lib/whatsapp'
import MidtransClient from 'midtrans-client'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getMidtransConfig() {
  const serverKey = import.meta.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY
  const clientKey = import.meta.env.PUBLIC_MIDTRANS_CLIENT_KEY || process.env.PUBLIC_MIDTRANS_CLIENT_KEY
  const isProduction = String(import.meta.env.PUBLIC_MIDTRANS_IS_PRODUCTION || process.env.PUBLIC_MIDTRANS_IS_PRODUCTION || 'false') === 'true'

  return { serverKey, clientKey, isProduction }
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)
    const { serverKey, clientKey, isProduction } = getMidtransConfig()
    if (!serverKey) {
      return json({ error: 'MIDTRANS_SERVER_KEY belum diset di Vercel' }, 500)
    }
    if (!clientKey) {
      return json({ error: 'PUBLIC_MIDTRANS_CLIENT_KEY belum diset di Vercel' }, 500)
    }

    const body = await request.json()
    const {
      cart,
      tipe_pesanan,
      id_meja,
      alamat_delivery,
      customer_name,
      customer_phone,
      catatan,
      metode_pembayaran = 'midtrans',
    } = body

    if (!Array.isArray(cart) || cart.length === 0) return json({ error: 'Cart kosong' }, 400)
    if (!['dine_in', 'takeaway', 'delivery'].includes(tipe_pesanan)) return json({ error: 'Tipe pesanan tidak valid' }, 400)
    if (tipe_pesanan === 'delivery' && !alamat_delivery) return json({ error: 'Alamat delivery wajib diisi' }, 400)

    const ids = cart.map((item) => item.id_menu)
    const { data: menuRows, error: menuError } = await supabaseAdmin
      .from('menu')
      .select('id, nama, harga, stok, tersedia')
      .in('id', ids)

    if (menuError) throw menuError

    const menuMap = new Map((menuRows || []).map((menu) => [menu.id, menu]))
    const details = cart.map((item) => {
      const menu = menuMap.get(item.id_menu)
      const jumlah = Number(item.jumlah || 0)
      if (!menu || !menu.tersedia) throw new Error(`Menu tidak tersedia: ${item.id_menu}`)
      if (jumlah < 1) throw new Error(`Jumlah tidak valid untuk ${menu.nama}`)
      if (menu.stok < jumlah) throw new Error(`Stok ${menu.nama} tidak cukup`)
      return {
        id_menu: menu.id,
        jumlah,
        harga_saat_pesan: menu.harga,
        catatan_item: item.catatan || null,
      }
    })

    const subtotal = details.reduce((sum, item) => sum + item.harga_saat_pesan * item.jumlah, 0)
    const pajak = 0
    const total = subtotal + pajak

    const { data: pesanan, error: orderError } = await supabaseAdmin
      .from('pesanan')
      .insert({
        id_meja: id_meja || null,
        tipe_pesanan,
        alamat_delivery: alamat_delivery || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        status: 'menunggu_pembayaran',
        subtotal,
        pajak,
        total,
        catatan: catatan || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    const { error: detailError } = await supabaseAdmin
      .from('detail_pesanan')
      .insert(details.map((item) => ({ ...item, id_pesanan: pesanan.id })))

    if (detailError) throw detailError

    if (metode_pembayaran === 'kasir') {
      await supabaseAdmin.from('pembayaran').insert({
        id_pesanan: pesanan.id,
        metode: 'tunai',
        status: 'pending',
      })

      sendAdminWhatsappNotification({
        orderId: pesanan.id,
        total,
        items: details.map((item) => ({
          nama: menuMap.get(item.id_menu)?.nama || `Menu #${item.id_menu}`,
          jumlah: item.jumlah,
        })),
      }).catch((error) => {
        console.error('whatsapp notification error', error)
      })

      return json({ pesanan, pembayaran: { metode: 'tunai', status: 'pending' } })
    }

    const orderId = `pesanan-${pesanan.id}`

    const snap = new MidtransClient.Snap({
      isProduction,
      serverKey,
      clientKey,
    })

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: total,
      },
      item_details: details.map((item) => ({
        id: item.id_menu,
        name: menuMap.get(item.id_menu)?.nama || `Menu #${item.id_menu}`,
        quantity: item.jumlah,
        price: item.harga_saat_pesan,
      })),
      customer_details: {
        first_name: customer_name || 'Customer',
        phone: customer_phone || undefined,
      },
      enabled_payments: ['gopay', 'shopeepay', 'qris', 'bank_transfer', 'credit_card'],
      bank_transfer: {
        banks: ['bca', 'bni', 'bri', 'mandiri'],
      },
    })

    await supabaseAdmin.from('pembayaran').insert({
      id_pesanan: pesanan.id,
      metode: 'midtrans',
      snap_token: transaction.token || null,
      redirect_url: transaction.redirect_url || null,
      status: 'pending',
    })

    sendAdminWhatsappNotification({
      orderId: pesanan.id,
      total,
      items: details.map((item) => ({
        nama: menuMap.get(item.id_menu)?.nama || `Menu #${item.id_menu}`,
        jumlah: item.jumlah,
      })),
    }).catch((error) => {
      console.error('whatsapp notification error', error)
    })

    return json({
      pesanan,
      midtrans: transaction,
      snapToken: transaction.token || null,
      redirectUrl: transaction.redirect_url || null,
    })
  } catch (error) {
    console.error('create-payment error', error)
    return json({ error: error.message || 'Checkout gagal' }, 500)
  }
}
