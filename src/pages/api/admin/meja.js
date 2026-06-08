import { supabaseAdmin } from '../../../lib/supabase'

const tableStatuses = new Set(['tersedia', 'dipakai', 'dibersihkan'])

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function requireUser(request) {
  if (!supabaseAdmin) {
    const error = new Error('SUPABASE_SERVICE_ROLE_KEY belum diset di Vercel')
    error.status = 500
    throw error
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) {
    const error = new Error('Belum login. Silakan login ulang.')
    error.status = 401
    throw error
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    const authError = new Error('Session admin tidak valid. Silakan login ulang.')
    authError.status = 401
    throw authError
  }

  return data.user
}

export async function POST({ request }) {
  try {
    await requireUser(request)
    const body = await request.json()
    const nomor_meja = Number(body.nomor_meja)

    if (!nomor_meja || nomor_meja < 1) {
      return json({ error: 'Nomor meja wajib valid' }, 400)
    }

    const payload = {
      nomor_meja,
      status: body.status || 'tersedia',
    }

    if (!tableStatuses.has(payload.status)) {
      return json({ error: 'Status meja tidak valid' }, 400)
    }

    if (body.qr_code) payload.qr_code = body.qr_code

    const { data, error } = await supabaseAdmin
      .from('meja')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return json({ meja: data })
  } catch (error) {
    return json({ error: error.message || 'Gagal menambah meja' }, error.status || 500)
  }
}

export async function PATCH({ request }) {
  try {
    await requireUser(request)
    const body = await request.json()
    const id = Number(body.id)

    if (!id) return json({ error: 'ID meja wajib ada' }, 400)

    const payload = {}
    if (body.status) {
      if (!tableStatuses.has(body.status)) {
        return json({ error: 'Status meja tidak valid' }, 400)
      }
      payload.status = body.status
    }
    if (body.qr_code !== undefined) payload.qr_code = body.qr_code
    if (body.nomor_meja !== undefined) payload.nomor_meja = Number(body.nomor_meja)

    const { data, error } = await supabaseAdmin
      .from('meja')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return json({ meja: data })
  } catch (error) {
    return json({ error: error.message || 'Gagal update meja' }, error.status || 500)
  }
}
