import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminTableManager() {
  const [tables, setTables] = useState([])
  const [nomor, setNomor] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('meja').select('*').order('nomor_meja')
    setTables(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const adminFetch = async (url, options = {}) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('Session admin tidak ditemukan. Silakan login ulang.')

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Request gagal')
    return data
  }

  const create = async (event) => {
    event.preventDefault()
    try {
      setError('')
      const { meja } = await adminFetch('/api/admin/meja', {
        method: 'POST',
        body: JSON.stringify({ nomor_meja: Number(nomor) }),
      })
      if (meja) {
        const url = `${window.location.origin}/meja/${meja.id}`
        try {
          await adminFetch('/api/admin/meja', {
            method: 'PATCH',
            body: JSON.stringify({ id: meja.id, qr_code: url }),
          })
        } catch {
          // Meja tetap berhasil dibuat; QR URL bisa digenerate dari ID jika schema cache belum refresh.
        }
      }
      setNomor('')
      load()
    } catch (createError) {
      setError(createError.message || 'Gagal menambah meja')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      setError('')
      await adminFetch('/api/admin/meja', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      })
      load()
    } catch (statusError) {
      setError(statusError.message || 'Gagal update status meja')
    }
  }

  const downloadQr = (table) => {
    const url = table.qr_code || `${window.location.origin}/meja/${table.id}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=600x600`
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `meja-${table.nomor_meja}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>Tambah meja</h2>
        {error && <p className="status-badge status-failed">{error}</p>}
        <form className="action-row" onSubmit={create}>
          <input type="number" min="1" value={nomor} onChange={(event) => setNomor(event.target.value)} placeholder="Nomor meja" required />
          <button type="submit">Tambah</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Daftar meja</h2>
        <table>
          <thead>
            <tr>
              <th>Meja</th>
              <th>URL</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => {
              const url = table.qr_code || `${window.location.origin}/meja/${table.id}`
              return (
                <tr key={table.id}>
                  <td><strong>Meja {table.nomor_meja}</strong></td>
                  <td><a href={url} target="_blank" rel="noreferrer">{url}</a></td>
                  <td>
                    <select value={table.status || 'tersedia'} onChange={(event) => updateStatus(table.id, event.target.value)}>
                      <option value="tersedia">tersedia</option>
                      <option value="dipakai">dipakai</option>
                      <option value="dibersihkan">dibersihkan</option>
                    </select>
                  </td>
                  <td><button className="secondary-button" onClick={() => downloadQr(table)}>Download QR</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
