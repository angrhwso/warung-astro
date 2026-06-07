import { supabaseAdmin } from '../../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function requireUser(request) {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diset')

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

function sanitizePayload(body) {
  return {
    nama: body.nama,
    deskripsi: body.deskripsi || null,
    harga: Number(body.harga || 0),
    stok: Number(body.stok || 0),
    id_kategori: body.id_kategori ? Number(body.id_kategori) : null,
    gambar_url: body.gambar_url || null,
    tersedia: Boolean(body.tersedia),
  }
}

export async function POST({ request }) {
  try {
    await requireUser(request)
    const body = await request.json()
    const payload = sanitizePayload(body)

    if (!payload.nama || payload.harga < 0) return json({ error: 'Nama dan harga wajib valid' }, 400)

    const { data, error } = await supabaseAdmin.from('menu').insert(payload).select().single()
    if (error) throw error

    return json({ menu: data })
  } catch (error) {
    return json({ error: error.message || 'Gagal menambah menu' }, error.status || 500)
  }
}

export async function PUT({ request }) {
  try {
    await requireUser(request)
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return json({ error: 'ID menu wajib ada' }, 400)

    const payload = sanitizePayload(body)
    const { data, error } = await supabaseAdmin.from('menu').update(payload).eq('id', id).select().single()
    if (error) throw error

    return json({ menu: data })
  } catch (error) {
    return json({ error: error.message || 'Gagal update menu' }, error.status || 500)
  }
}

export async function PATCH({ request }) {
  try {
    await requireUser(request)
    const body = await request.json()
    const id = Number(body.id)
    if (!id) return json({ error: 'ID menu wajib ada' }, 400)

    const { data, error } = await supabaseAdmin
      .from('menu')
      .update({ tersedia: Boolean(body.tersedia) })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    return json({ menu: data })
  } catch (error) {
    return json({ error: error.message || 'Gagal update status menu' }, error.status || 500)
  }
}

export async function DELETE({ request }) {
  try {
    await requireUser(request)
    const { id } = await request.json()
    if (!Number(id)) return json({ error: 'ID menu wajib ada' }, 400)

    const { error } = await supabaseAdmin.from('menu').delete().eq('id', Number(id))
    if (error) throw error

    return json({ ok: true })
  } catch (error) {
    return json({ error: error.message || 'Gagal menghapus menu' }, error.status || 500)
  }
}
