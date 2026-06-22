import { supabaseAdmin } from '../../../lib/supabase'
import { sendCustomerWhatsappNotification } from '../../../lib/whatsapp'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function requireUser(request) {
  if (!supabaseAdmin) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY belum diset')
    error.status = 500
    throw error
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) {
    const error = new Error('Belum login')
    error.status = 401
    throw error
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    const authError = new Error('Session admin tidak valid')
    authError.status = 401
    throw authError
  }

  return data.user
}

export async function POST({ request }) {
  try {
    await requireUser(request)

    const body = await request.json()
    const id = Number(body.id)

    if (!id) return json({ error: 'ID pesanan wajib ada' }, 400)

    const { data: pesanan, error: pesananError } = await supabaseAdmin
      .from('pesanan')
      .select('id, customer_phone')
      .eq('id', id)
      .maybeSingle()

    if (pesananError) throw pesananError
    if (!pesanan) return json({ error: 'Pesanan tidak ditemukan' }, 404)

    const paidAt = new Date().toISOString()

    const { error: paymentError } = await supabaseAdmin
      .from('pembayaran')
      .update({
        status: 'paid',
        paid_at: paidAt,
      })
      .eq('id_pesanan', id)

    if (paymentError) throw paymentError

    const { error: orderError } = await supabaseAdmin
      .from('pesanan')
      .update({ status: 'diproses' })
      .eq('id', id)

    if (orderError) throw orderError

    const trackingUrl = new URL(`/tracking/${id}`, request.url).toString()
    await sendCustomerWhatsappNotification({
      customerPhone: pesanan.customer_phone,
      id,
      status: 'diproses',
      trackingUrl,
    })

    return json({
      ok: true,
      id,
      pembayaran: {
        status: 'paid',
        paid_at: paidAt,
      },
      pesanan: {
        status: 'diproses',
      },
    })
  } catch (error) {
    return json({ error: error.message || 'Simulasi pembayaran gagal' }, error.status || 500)
  }
}
