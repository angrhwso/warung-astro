import { supabaseAdmin } from '../../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isTestingModeEnabled() {
  return String(import.meta.env.PUBLIC_MIDTRANS_TESTING_MODE || process.env.PUBLIC_MIDTRANS_TESTING_MODE || 'false') === 'true'
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)

    const allowed = import.meta.env.DEV === true || isTestingModeEnabled()
    if (!allowed) return json({ error: 'Endpoint simulasi hanya tersedia di development/testing' }, 403)

    const body = await request.json().catch(() => ({}))
    const idPesanan = Number(body.id_pesanan || body.id || 0)

    if (!idPesanan) return json({ error: 'id_pesanan wajib diisi' }, 400)

    const paidAt = new Date().toISOString()

    const { error: paymentError } = await supabaseAdmin
      .from('pembayaran')
      .update({
        status: 'paid',
        paid_at: paidAt,
      })
      .eq('id_pesanan', idPesanan)

    if (paymentError) throw paymentError

    const { error: orderError } = await supabaseAdmin
      .from('pesanan')
      .update({
        status: 'diproses',
      })
      .eq('id', idPesanan)

    if (orderError) throw orderError

    return json({
      ok: true,
      id_pesanan: idPesanan,
      pembayaran: {
        status: 'paid',
        paid_at: paidAt,
      },
      pesanan: {
        status: 'diproses',
      },
    })
  } catch (error) {
    console.error('simulate-payment error', error)
    return json({ error: error.message || 'Simulasi pembayaran gagal' }, 500)
  }
}
