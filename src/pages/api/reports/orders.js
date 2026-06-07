import { supabaseAdmin } from '../../../lib/supabase'

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export async function GET({ url }) {
  try {
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }), { status: 500 })
    }

    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let query = supabaseAdmin.from('pesanan').select('*').order('created_at', { ascending: true })
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', `${to}T23:59:59`)

    const { data, error } = await query
    if (error) throw error

    const rows = [
      ['id', 'created_at', 'tipe_pesanan', 'status', 'subtotal', 'pajak', 'total', 'customer_name', 'customer_phone'],
      ...(data || []).map((order) => [
        order.id,
        order.created_at,
        order.tipe_pesanan,
        order.status,
        order.subtotal,
        order.pajak,
        order.total,
        order.customer_name,
        order.customer_phone,
      ]),
    ]

    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders.csv"',
      },
    })
  } catch (error) {
    console.error('orders report error', error)
    return new Response(JSON.stringify({ error: error.message || 'Export gagal' }), { status: 500 })
  }
}
