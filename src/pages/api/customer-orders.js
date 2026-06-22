import { supabaseAdmin } from '../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '')
}

export async function GET({ url }) {
  try {
    if (!supabaseAdmin) {
      return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)
    }

    const phone = normalizePhone(url.searchParams.get('phone'))

    if (!phone) {
      return json({ error: 'Nomor WhatsApp wajib diisi' }, 400)
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('pesanan')
      .select('*, detail_pesanan(*, menu(nama, harga))')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    return json({ ok: true, orders: orders || [] })
  } catch (error) {
    console.error('customer-orders error', error)
    return json({ error: error.message || 'Riwayat gagal dimuat' }, 500)
  }
}
