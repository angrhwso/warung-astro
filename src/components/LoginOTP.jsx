import React, { useState } from 'react'

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '')
}

export default function LoginOTP() {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const submitPhone = (event) => {
    event.preventDefault()
    const normalized = normalizePhone(phone)

    if (!normalized) {
      setMessage('Nomor WhatsApp wajib diisi.')
      return
    }

    setMessage('')
    window.dispatchEvent(
      new CustomEvent('customer-phone-submitted', {
        detail: { phone: normalized },
      })
    )
  }

  return (
    <section className="otp-card">
      <div className="otp-card-head">
        <div>
          <p className="eyebrow">Riwayat Customer</p>
          <h2>Masukkan Nomor WhatsApp</h2>
        </div>
      </div>

      {message && <p className="otp-message" role="status">{message}</p>}

      <form className="otp-form" onSubmit={submitPhone}>
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
        <button type="submit">Lihat Riwayat</button>
      </form>
    </section>
  )
}
