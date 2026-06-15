import React, { useEffect, useMemo, useState } from 'react'

const SESSION_KEY = 'warung-customer-session'

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

function loadSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.expires_at || new Date(session.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export default function LoginOTP() {
  const initialSession = useMemo(() => loadSession(), [])
  const [phone, setPhone] = useState(initialSession?.phone || '')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(initialSession ? 'verified' : 'phone')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!countdown) return undefined
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    if (!initialSession) return
    window.dispatchEvent(new CustomEvent('customer-session-updated', { detail: initialSession }))
  }, [initialSession])

  const sendOtp = async (event) => {
    event.preventDefault()
    setMessage('')
    const normalized = normalizePhone(phone)
    if (!normalized) {
      setMessage('Nomor WhatsApp wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/customer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: normalized }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim OTP')
      setPhone(normalized)
      setStep('verify')
      setCountdown(600)
      setMessage('OTP berhasil dikirim ke WhatsApp Anda.')
    } catch (error) {
      setMessage(error.message || 'Gagal mengirim OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setMessage('')
    const normalized = normalizePhone(phone)
    if (!normalized || !otp.trim()) {
      setMessage('Nomor WhatsApp dan OTP wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/customer-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phone: normalized, otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'OTP tidak valid')

      const session = data.session
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
      window.dispatchEvent(new CustomEvent('customer-session-updated', { detail: session }))
      setStep('verified')
      setMessage('Login berhasil. Riwayat pesanan dimuat.')
      setOtp('')
    } catch (error) {
      setMessage(error.message || 'Verifikasi gagal')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setStep('phone')
    setOtp('')
    setMessage('Sesi sudah dihapus.')
    window.dispatchEvent(new CustomEvent('customer-session-cleared'))
  }

  return (
    <section className="otp-card">
      <div className="otp-card-head">
        <div>
          <p className="eyebrow">Login Customer</p>
          <h2>Masuk dengan OTP WhatsApp</h2>
        </div>
        {step === 'verified' && <button className="otp-link" type="button" onClick={logout}>Logout</button>}
      </div>

      {message && <p className="otp-message" role="status">{message}</p>}

      {step !== 'verified' ? (
        step === 'phone' ? (
          <form className="otp-form" onSubmit={sendOtp}>
            <label>
              Nomor WhatsApp
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="08xxxxxxxxxx"
                inputMode="numeric"
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Mengirim OTP...' : 'Kirim OTP'}
            </button>
          </form>
        ) : (
          <form className="otp-form" onSubmit={verifyOtp}>
            <label>
              Nomor WhatsApp
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="numeric" required />
            </label>
            <label>
              OTP 6 Digit
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                required
              />
            </label>
            <div className="otp-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
              </button>
              <button type="button" className="otp-secondary" onClick={sendOtp} disabled={loading || countdown > 0}>
                {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim Ulang OTP'}
              </button>
            </div>
          </form>
        )
      ) : (
        <div className="otp-verified">
          <p>Session aktif untuk nomor <strong>{phone}</strong>.</p>
          <button className="otp-secondary" type="button" onClick={() => window.dispatchEvent(new Event('customer-session-updated'))}>
            Muat riwayat
          </button>
        </div>
      )}
    </section>
  )
}
