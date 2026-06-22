import { createHash } from 'node:crypto'
import { supabaseAdmin } from '../../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function verifySignature(payload) {
  const serverKey = import.meta.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) return false

  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`
  const signature = createHash('sha512').update(raw).digest('hex')
  return signature === payload.signature_key
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)

    console.log('MIDTRANS WEBHOOK MASUK', payload)
    const payload = await request.json()
    const { order_id, transaction_status, transaction_id, fraud_status } = payload

    if (!order_id) return json({ ok: false, message: 'order_id wajib ada' }, 400)
    if (payload.signature_key && !verifySignature(payload)) {
      return json({ ok: false, message: 'signature tidak valid' }, 403)
    }

    const match = String(order_id).match(/^pesanan-(\d+)$/)
    if (!match) return json({ ok: false, message: 'format order_id tidak dikenali' }, 400)

    const id_pesanan = Number(match[1])
    const paid = ['settlement', 'capture'].includes(transaction_status) && fraud_status !== 'deny'
    const failed = ['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)
    const paymentStatus = paid ? 'paid' : failed ? 'failed' : 'pending'

    const { error: paymentError } = await supabaseAdmin.from('pembayaran').upsert(
      {
        id_pesanan,
        transaction_id,
        status: paymentStatus,
        paid_at: paid ? new Date().toISOString() : null,
      },
      { onConflict: 'id_pesanan' }
    )
    if (paymentError) throw paymentError

    if (paid) {
      const { error } = await supabaseAdmin.from('pesanan').update({ status: 'diproses' }).eq('id', id_pesanan)
      if (error) throw error
    } else if (failed) {
      const { error } = await supabaseAdmin.from('pesanan').update({ status: 'dibatalkan' }).eq('id', id_pesanan)
      if (error) throw error
    }

    return json({ ok: true })
  } catch (error) {
    console.error('midtrans webhook error', error)
    return json({ error: error.message || 'Webhook gagal' }, 500)
  }
}
