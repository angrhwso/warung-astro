import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = {
  id: null,
  nama: '',
  deskripsi: '',
  harga: '',
  stok: '',
  id_kategori: '',
  gambar_url: '',
  tersedia: true,
}

export default function AdminMenuManager() {
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [image, setImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: menuData }, { data: categoryData }, { data: logData }] = await Promise.all([
      supabase.from('menu').select('*, kategori(nama)').order('created_at', { ascending: false }),
      supabase.from('kategori').select('*').order('urutan'),
      supabase.from('log_stok').select('*, menu(nama)').order('created_at', { ascending: false }).limit(30),
    ])
    setMenus(menuData || [])
    setCategories(categoryData || [])
    setStockLogs(logData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

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

  const uploadImage = async () => {
    if (!image) return form.gambar_url || null

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(image)
    })

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: image.name, base64, contentType: image.type }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Upload gagal')
    return data.publicUrl
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const gambar_url = await uploadImage()
      const payload = {
        nama: form.nama,
        deskripsi: form.deskripsi || null,
        harga: Number(form.harga),
        stok: Number(form.stok || 0),
        id_kategori: form.id_kategori ? Number(form.id_kategori) : null,
        gambar_url,
        tersedia: form.tersedia,
      }

      if (form.id) {
        await adminFetch('/api/admin/menu', {
          method: 'PUT',
          body: JSON.stringify({ ...payload, id: form.id }),
        })
      } else {
        await adminFetch('/api/admin/menu', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      setForm(emptyForm)
      setImage(null)
      await load()
    } catch (submitError) {
      setError(submitError.message || 'Gagal menyimpan menu')
    } finally {
      setSaving(false)
    }
  }

  const edit = (menu) => {
    setForm({
      id: menu.id,
      nama: menu.nama || '',
      deskripsi: menu.deskripsi || '',
      harga: menu.harga || '',
      stok: menu.stok || 0,
      id_kategori: menu.id_kategori || '',
      gambar_url: menu.gambar_url || '',
      tersedia: Boolean(menu.tersedia),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (id) => {
    if (!confirm('Hapus menu ini?')) return
    try {
      setError('')
      await adminFetch('/api/admin/menu', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      })
      load()
    } catch (removeError) {
      setError(removeError.message || 'Gagal menghapus menu')
    }
  }

  const toggle = async (menu) => {
    try {
      setError('')
      await adminFetch('/api/admin/menu', {
        method: 'PATCH',
        body: JSON.stringify({ id: menu.id, tersedia: !menu.tersedia }),
      })
      load()
    } catch (toggleError) {
      setError(toggleError.message || 'Gagal update status menu')
    }
  }

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>{form.id ? 'Edit menu' : 'Tambah menu'}</h2>
        {error && <p className="status-badge status-failed">{error}</p>}
        <form className="form-grid" onSubmit={submit}>
          <label>
            Nama
            <input value={form.nama} onChange={(event) => setField('nama', event.target.value)} required />
          </label>
          <label>
            Harga
            <input type="number" min="0" value={form.harga} onChange={(event) => setField('harga', event.target.value)} required />
          </label>
          <label>
            Stok
            <input type="number" min="0" value={form.stok} onChange={(event) => setField('stok', event.target.value)} />
          </label>
          <label>
            Kategori
            <select value={form.id_kategori} onChange={(event) => setField('id_kategori', event.target.value)}>
              <option value="">Tanpa kategori</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>{category.nama}</option>
              ))}
            </select>
          </label>
          <label className="full-span">
            Deskripsi
            <textarea value={form.deskripsi} onChange={(event) => setField('deskripsi', event.target.value)} />
          </label>
          <label>
            Gambar
            <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} />
          </label>
          <label>
            Tersedia
            <select value={form.tersedia ? 'true' : 'false'} onChange={(event) => setField('tersedia', event.target.value === 'true')}>
              <option value="true">Ya</option>
              <option value="false">Tidak</option>
            </select>
          </label>
          <div className="action-row full-span">
            <button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            {form.id && <button className="secondary-button" type="button" onClick={() => setForm(emptyForm)}>Batal edit</button>}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Daftar menu</h2>
        <table>
          <thead>
            <tr>
              <th>Menu</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {menus.map((menu) => (
              <tr key={menu.id}>
                <td>
                  <strong>{menu.nama}</strong>
                  <br />
                  {menu.kategori?.nama || 'Tanpa kategori'}
                </td>
                <td>Rp {Number(menu.harga || 0).toLocaleString('id-ID')}</td>
                <td>{menu.stok}</td>
                <td><span className="status-badge">{menu.tersedia ? 'tersedia' : 'nonaktif'}</span></td>
                <td>
                  <div className="action-row">
                    <button className="secondary-button" onClick={() => edit(menu)}>Edit</button>
                    <button className="secondary-button" onClick={() => toggle(menu)}>{menu.tersedia ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button className="secondary-button" onClick={() => remove(menu.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Log stok</h2>
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Menu</th>
              <th>Perubahan</th>
              <th>Alasan</th>
            </tr>
          </thead>
          <tbody>
            {stockLogs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td>{log.menu?.nama || '-'}</td>
                <td>{log.perubahan}</td>
                <td>{log.alasan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
