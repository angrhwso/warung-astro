import { supabaseAdmin } from '../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)

    const { filename, base64, contentType } = await request.json()
    if (!filename || !base64) return json({ error: 'File belum lengkap' }, 400)

    if (!String(contentType || '').startsWith('image/')) {
      return json({ error: 'Hanya file gambar (image/*) yang diperbolehkan' }, 400)
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${Date.now()}-${safeName}`
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      return json({ error: 'Ukuran gambar maksimal 5MB' }, 400)
    }

    const { data, error } = await supabaseAdmin.storage
      .from('menu-images')
      .upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: false,
      })

    if (error) {
      const message = String(error.message || '')
      if (message.toLowerCase().includes('bucket not found')) {
        return json({ error: 'Bucket menu-images belum ada di Supabase Storage' }, 500)
      }
      return json({ error: message || 'Upload gagal' }, 500)
    }

    const { data: publicData } = supabaseAdmin.storage.from('menu-images').getPublicUrl(path)
    return json({ path: data?.path || path, publicUrl: publicData.publicUrl })
  } catch (error) {
    console.error('upload error', error)
    return json({ error: error.message || 'Upload gagal' }, 500)
  }
}
