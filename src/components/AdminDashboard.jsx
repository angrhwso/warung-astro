import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [newOrders, setNewOrders] = useState(0)
  const [testingMode, setTestingMode] = useState(false)

  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date.toISOString()
  }, [])

  const metrics = useMemo(() => {
    const todayOrders = orders.filter((order) => new Date(order.created_at).toISOString() >= today)
    return {
      todayOrders: todayOrders.length,
      revenue: todayOrders
        .filter((order) => ['diproses', 'siap', 'selesai'].includes(order.status))
        .reduce((sum, order) => sum + (order.total || 0), 0),
      pending: orders.filter((order) => order.status === 'menunggu_pembayaran').length,
      lowStock: lowStock.length,
    }
  }, [lowStock.length, orders, today])

  async function fetchPesanan() {
    const [{ data: orderData }, { data: stockData }] = await Promise.all([
      supabase.from('pesanan').select('*').order('created_at', { ascending: false }),
      supabase.from('menu').select('*').lte('stok', 5).order('stok'),
    ])
    setOrders(orderData || [])
    setLowStock(stockData || [])
  }

  useEffect(() => {
    try {
      setTestingMode(localStorage.getItem('warung-midtrans-testing') === '1')
    } catch {}

    fetchPesanan()

    const channel = supabase
      .channel('pesanan')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pesanan' }, (payload) => {
        if (payload.new) {
          setOrders((prev) => [payload.new, ...prev])
        }
        fetchPesanan()
        setNewOrders((count) => count + 1)
        try {
          const context = new AudioContext()
          const oscillator = context.createOscillator()
          oscillator.frequency.value = 880
          oscillator.connect(context.destination)
          oscillator.start()
          oscillator.stop(context.currentTime + 0.12)
        } catch {}
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const toggleTestingMode = () => {
    const next = !testingMode
    setTestingMode(next)
    try {
      localStorage.setItem('warung-midtrans-testing', next ? '1' : '0')
    } catch {}
  }

  return (
    <div className="admin-grid">
      <section className="stat-grid">
        <article className="admin-card">
          <span>Pesanan hari ini</span>
          <strong className="stat-number">{metrics.todayOrders}</strong>
        </article>
        <article className="admin-card">
          <span>Pendapatan</span>
          <strong className="stat-number">{currency.format(metrics.revenue)}</strong>
        </article>
        <article className="admin-card">
          <span>Pending</span>
          <strong className="stat-number">{metrics.pending}</strong>
        </article>
        <article className="admin-card">
          <span>Stok menipis</span>
          <strong className="stat-number">{metrics.lowStock}</strong>
        </article>
      </section>

      {newOrders > 0 && (
        <section className="admin-card">
          <strong>{newOrders} pesanan baru</strong>
          <button className="secondary-button" onClick={() => setNewOrders(0)}>Tandai dibaca</button>
        </section>
      )}

      <section className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-black">Mode Testing Midtrans</h2>
            <p className="empty-cart">Jika aktif, halaman pembayaran akan melewati cek status Midtrans dan langsung sukses.</p>
          </div>
          <button className="secondary-button" type="button" onClick={toggleTestingMode}>
            {testingMode ? 'Matikan Testing' : 'Aktifkan Testing'}
          </button>
        </div>
        <p className={`status-badge ${testingMode ? 'status-selesai' : 'status-pending'} mt-3`}>
          {testingMode ? 'Testing aktif' : 'Testing nonaktif'}
        </p>
      </section>

      <section className="admin-card">
        <h2>Pesanan terbaru</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Tipe</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.customer_name || '-'}</td>
                <td>{order.tipe_pesanan}</td>
                <td>{currency.format(order.total || 0)}</td>
                <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Stok menipis</h2>
        <table>
          <thead>
            <tr>
              <th>Menu</th>
              <th>Stok</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map((menu) => (
              <tr key={menu.id}>
                <td>{menu.nama}</td>
                <td>{menu.stok}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
