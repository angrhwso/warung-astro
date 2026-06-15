import { randomBytes, randomInt } from 'node:crypto'
import { supabaseAdmin } from '../../lib/supabase'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getEnv() {
  return {
    whatsappApiKey: import.meta.env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_KEY || '',
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '')
}

async function sendOtpWhatsapp(phone, otp) {
  const { whatsappApiKey } = getEnv()
  if (!whatsappApiKey) return { skipped: true }

  const text = `Kode OTP warung Astro Anda: ${otp}. Berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.`
  const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(whatsappApiKey)}`
  const response = await fetch(endpoint)
  const body = await response.text().catch(() => '')
  return { ok: response.ok, body }
}

export async function POST({ request }) {
  try {
    if (!supabaseAdmin) {
      return json({ error: 'SUPABASE_SERVICE_ROLE_KEY belum diset' }, 500)
    }

    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '').toLowerCase()
    const phone = normalizePhone(body.phone)

    if (!phone) {
      return json({ error: 'Nomor WhatsApp wajib diisi' }, 400)
    }

    if (action === 'send') {
      const otp = String(randomInt(100000, 1000000))
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      const { error } = await supabaseAdmin
        .from('customer_sessions')
        .upsert({
          phone,
          otp_code: otp,
          otp_expires_at: otpExpiresAt,
          is_verified: false,
          session_token: null,
          session_expires_at: null,
        }, { onConflict: 'phone' })

      if (error) throw error

      const sent = await sendOtpWhatsapp(phone, otp)
      return json({
        ok: true,
        message: 'OTP berhasil dikirim',
        otp_expires_at: otpExpiresAt,
        whatsapp: sent,
      })
    }

    if (action === 'verify') {
      const otp = String(body.otp || '').trim()
      if (!otp) {
        return json({ error: 'Kode OTP wajib diisi' }, 400)
      }

      const { data: session, error } = await supabaseAdmin
        .from('customer_sessions')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()

      if (error) throw error
      if (!session) return json({ error: 'OTP belum dikirim' }, 404)
      if (String(session.otp_code || '') !== otp) return json({ error: 'OTP tidak valid' }, 400)
      if (session.otp_expires_at && new Date(session.otp_expires_at).getTime() < Date.now()) {
        return json({ error: 'OTP sudah kedaluwarsa' }, 400)
      }

      const sessionToken = randomBytes(24).toString('hex')
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { error: updateError } = await supabaseAdmin
        .from('customer_sessions')
        .update({
          otp_code: null,
          otp_expires_at: null,
          is_verified: true,
          session_token: sessionToken,
          session_expires_at: sessionExpiresAt,
        })
        .eq('phone', phone)

      if (updateError) throw updateError

      return json({
        ok: true,
        message: 'Login berhasil',
        session: {
          phone,
          token: sessionToken,
          expires_at: sessionExpiresAt,
        },
      })
    }

    return json({ error: 'Aksi tidak valid' }, 400)
  } catch (error) {
    console.error('customer-auth error', error)
    return json({ error: error.message || 'Autentikasi gagal' }, 500)
  }
}
