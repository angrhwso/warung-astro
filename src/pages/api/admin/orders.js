import { supabaseAdmin } from '../../../lib/supabase'
import { sendCustomerWhatsappNotification } from '../../../lib/whatsapp'

const validStatuses = new Set(['menunggu_pembayaran', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan'])
const notifyTransitions = new Map([
  ['diproses->siap_diambil', 'siap_diambil'],
  ['siap_diambil->selesai', 'selesai'],
])

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

export async function PATCH({ request }) {
  try {
    await requireUser(request)

    const body = await request.json()
    const id = Number(body.id)
    const status = String(body.status || '')

    if (!id) return json({ error: 'ID pesanan wajib ada' }, 400)
    if (!validStatuses.has(status)) return json({ error: 'Status pesanan tidak valid' }, 400)

    const { data: currentOrder, error: currentError } = await supabaseAdmin
      .from('pesanan')
      .select('id, status, customer_phone')
      .eq('id', id)
      .maybeSingle()

    if (currentError) throw currentError
    if (!currentOrder) return json({ error: 'Pesanan tidak ditemukan' }, 404)

    const { data: order, error } = await supabaseAdmin
      .from('pesanan')
      .update({ status })
      .eq('id', id)
      .select('id, status, customer_phone')
      .single()

    if (error) throw error

    const transitionKey = `${currentOrder.status}->${status}`
    const notifyStatus = notifyTransitions.get(transitionKey)

    if (notifyStatus) {
      const trackingUrl = new URL(`/tracking/${id}`, request.url).toString()
      sendCustomerWhatsappNotification({
        customerPhone: order?.customer_phone || currentOrder.customer_phone,
        id,
        status: notifyStatus,
        trackingUrl,
      }).catch((whatsappError) => {
        console.error('customer whatsapp error', whatsappError)
      })
    }

    return json({ order })
  } catch (error) {
    return json({ error: error.message || 'Gagal update status pesanan' }, error.status || 500)
  }
}
