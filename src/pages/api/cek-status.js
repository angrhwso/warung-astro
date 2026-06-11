import { supabaseAdmin } from '../../lib/supabase'

const MIDTRANS_STATUS_API = 'https://api.midtrans.com/v2'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getMidtransConfig() {
  const serverKey = import.meta.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY
  const rawMode =
    import.meta.env.PUBLIC_MIDTRANS_IS_PRODUCTION ||
    import.meta.env.MIDTRANS_IS_PRODUCTION ||
    process.env.PUBLIC_MIDTRANS_IS_PRODUCTION ||
    process.env.MIDTRANS_IS_PRODUCTION
  const isProduction =
    rawMode !== undefined
      ? String(rawMode) === 'true'
      : !String(serverKey || '').startsWith('SB-')

  const testingMode =
    String(import.meta.env.PUBLIC_MIDTRANS_TESTING_MODE || process.env.PUBLIC_MIDTRANS_TESTING_MODE || 'false') === 'true'

  return { serverKey, isProduction, testingMode }
}

export async function GET({ url }) {
  try {
    const id = url.searchParams.get('id')
    const testing = url.searchParams.get('testing') === '1'

    if (!id) return json({ error: 'missing id' }, 400)

    const [{ data: pembayaran }, { data: pesanan }] = supabaseAdmin
      ? await Promise.all([
          supabaseAdmin.from('pembayaran').select('*').eq('id_pesanan', Number(id)).maybeSingle(),
          supabaseAdmin
            .from('pesanan')
            .select('*, meja(nomor_meja), detail_pesanan(*, menu(nama))')
            .eq('id', Number(id))
            .maybeSingle(),
        ])
      : [{ data: null }, { data: null }]

    const { serverKey, isProduction, testingMode } = getMidtransConfig()
    if (testing || testingMode) {
      return json({
        testing: true,
        status: 'settlement',
        message: 'testing mode',
        pembayaran: pembayaran || {
          id_pesanan: Number(id),
          status: 'paid',
          metode: 'midtrans',
        },
      })
    }

    if (!serverKey) {
      return json({ error: 'MIDTRANS_SERVER_KEY belum diset' }, 500)
    }

    const orderId = `pesanan-${id}`
    const response = await fetch(`${MIDTRANS_STATUS_API}/${orderId}/status`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.status === 404) {
      return json({
        not_found: true,
        status: 'pending',
        message: 'Transaksi belum ditemukan di Midtrans',
        midtrans: data,
        pembayaran,
        pesanan,
      }, 404)
    }

    if (!response.ok) {
      return json({
        error: data?.status_message || data?.error_messages?.[0] || 'Midtrans status gagal dimuat',
        midtrans: data,
        isProduction,
      }, response.status)
    }

    const paid = ['settlement', 'capture'].includes(data.transaction_status) && data.fraud_status !== 'deny'
    const failed = ['deny', 'cancel', 'expire', 'failure'].includes(data.transaction_status)
    const status = paid ? 'paid' : failed ? 'failed' : 'pending'

    if (supabaseAdmin) {
      await supabaseAdmin.from('pembayaran').upsert(
        {
          id_pesanan: Number(id),
          transaction_id: data.transaction_id || null,
          status,
          paid_at: paid ? new Date().toISOString() : null,
        },
        { onConflict: 'id_pesanan' }
      )
    }

    return json({
      status,
      midtrans: data,
      pembayaran,
      pesanan,
    })
  } catch (error) {
    return json({ error: error.message || 'Status gagal dimuat' }, 500)
  }
}
