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

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-')
    const path = `${Date.now()}-${safeName}`
    const buffer = Buffer.from(base64, 'base64')

    const { data, error } = await supabaseAdmin.storage
      .from('menu-images')
      .upload(path, buffer, {
        contentType: contentType || 'image/jpeg',
        upsert: false,
      })

    if (error) return json({ error: error.message }, 500)

    const { data: publicData } = supabaseAdmin.storage.from('menu-images').getPublicUrl(path)
    return json({ path: data?.path || path, publicUrl: publicData.publicUrl })
  } catch (error) {
    console.error('upload error', error)
    return json({ error: error.message || 'Upload gagal' }, 500)
  }
}
