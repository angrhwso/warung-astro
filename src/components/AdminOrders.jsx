import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const statuses = [
  { value: 'menunggu_pembayaran', label: 'Menunggu' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'siap_diambil', label: 'Siap Diambil' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
]
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [error, setError] = useState('')

  const playDing = async () => {
    try {
      const audio = new Audio('/ding.mp3')
      await audio.play()
    } catch {
      try {
        const context = new AudioContext()
        const oscillator = context.createOscillator()
        oscillator.frequency.value = 880
        oscillator.connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.12)
      } catch {}
    }
  }

  async function load() {
    const { data } = await supabase
      .from('pesanan')
      .select('*, meja(nomor_meja), detail_pesanan(*, menu(nama))')
      .order('created_at', { ascending: false })
    setOrders(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, (payload) => {
        load()
        if (payload.eventType === 'INSERT') {
          setNewOrderCount((count) => count + 1)
          playDing()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const updateStatus = async (id, status) => {
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Gagal update status')
      load()
    } catch (updateError) {
      setError(updateError.message || 'Gagal update status')
    }
  }

  const visibleOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter)

  return (
    <section className="admin-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="category-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Semua</button>
          {statuses.map((status) => (
            <button className={filter === status.value ? 'active' : ''} onClick={() => setFilter(status.value)} key={status.value}>
              {status.label}
            </button>
          ))}
        </div>
        {newOrderCount > 0 && (
          <button className="secondary-button" type="button" onClick={() => setNewOrderCount(0)}>
            {newOrderCount} pesanan baru
          </button>
        )}
      </div>

      {error && <p className="status-badge status-failed mb-3">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Pesanan</th>
            <th>Item</th>
            <th>Total</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {visibleOrders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong>#{order.id}</strong>
                <br />
                {order.customer_name || '-'} {order.customer_phone ? `(${order.customer_phone})` : ''}
                <br />
                {order.tipe_pesanan}
                {order.meja?.nomor_meja ? ` - Meja ${order.meja.nomor_meja}` : ''}
                {order.alamat_delivery ? <><br />{order.alamat_delivery}</> : null}
              </td>
              <td>
                {(order.detail_pesanan || []).map((item) => (
                  <div key={item.id}>
                    {item.jumlah}x {item.menu?.nama || `Menu #${item.id_menu}`}
                  </div>
                ))}
              </td>
              <td>{currency.format(order.total || 0)}</td>
              <td><span className={`status-badge status-${order.status}`}>{statuses.find((item) => item.value === order.status)?.label || order.status}</span></td>
              <td>
                <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                  {statuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
