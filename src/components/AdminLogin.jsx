import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (loginError) {
      setError(loginError.message)
      return
    }

    window.location.href = '/admin/dashboard'
  }

  return (
    <main className="auth-page">
      <form className="auth-card checkout-form" onSubmit={submit}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Masuk Dashboard</h1>
        </div>
        {error && <p role="alert">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Memeriksa...' : 'Login'}</button>
      </form>
    </main>
  )
}
