import { supabaseAdmin } from '../../../lib/supabase'

const MIDTRANS_API = 'https://api.midtrans.com/v2/charge'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authHeader() {
  const serverKey = import.meta.env.MIDTRANS_SERVER_KEY
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)
    if (!import.meta.env.MIDTRANS_SERVER_KEY) return json({ error: 'MIDTRANS_SERVER_KEY belum diset' }, 500)

    const body = await request.json()
    const {
      cart,
      tipe_pesanan,
      id_meja,
      alamat_delivery,
      customer_name,
      customer_phone,
      catatan,
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

    const orderId = `pesanan-${pesanan.id}`
    const midtransResponse = await fetch(MIDTRANS_API, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: total,
        },
        customer_details: {
          first_name: customer_name || 'Customer',
          phone: customer_phone || undefined,
        },
      }),
    })

    const midtrans = await midtransResponse.json()
    if (!midtransResponse.ok) {
      await supabaseAdmin.from('pesanan').update({ status: 'dibatalkan' }).eq('id', pesanan.id)
      return json({ error: midtrans.status_message || 'Midtrans gagal membuat transaksi', midtrans }, 502)
    }

    const paymentLink = midtrans.actions?.find((action) => action.name === 'generate-qr-code')?.url
      || midtrans.actions?.[0]?.url
      || null
    const qrCode = midtrans.qr_string || paymentLink

    await supabaseAdmin.from('pembayaran').insert({
      id_pesanan: pesanan.id,
      metode: 'qris',
      transaction_id: midtrans.transaction_id || null,
      payment_link: paymentLink,
      qr_code: qrCode,
      status: midtrans.transaction_status === 'settlement' ? 'paid' : 'pending',
    })

    return json({ midtrans, pesanan })
  } catch (error) {
    console.error('create-payment error', error)
    return json({ error: error.message || 'Checkout gagal' }, 500)
  }
}
