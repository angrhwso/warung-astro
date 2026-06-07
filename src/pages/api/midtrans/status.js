import { supabaseAdmin } from '../../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET({ url }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)

    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'missing id' }, 400)

    const [{ data: pembayaran }, { data: pesanan }] = await Promise.all([
      supabaseAdmin.from('pembayaran').select('*').eq('id_pesanan', id).maybeSingle(),
      supabaseAdmin.from('pesanan').select('*').eq('id', id).maybeSingle(),
    ])

    return json({ pembayaran, pesanan })
  } catch (error) {
    console.error('status api error', error)
    return json({ error: error.message || 'Status gagal dimuat' }, 500)
  }
}
