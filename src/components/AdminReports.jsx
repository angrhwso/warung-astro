import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminReports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [orders, setOrders] = useState([])
  const [stock, setStock] = useState([])
  const [menuLogs, setMenuLogs] = useState([])

  async function load() {
    let orderQuery = supabase.from('pesanan').select('*').order('created_at', { ascending: false })
    if (from) orderQuery = orderQuery.gte('created_at', from)
    if (to) orderQuery = orderQuery.lte('created_at', `${to}T23:59:59`)

    const [{ data: orderData }, { data: stockData }, { data: logData }] = await Promise.all([
      orderQuery,
      supabase.from('menu').select('*').gt('stok', 0).order('stok', { ascending: false }),
      supabase.from('log_menu').select('*').eq('aksi', 'insert').order('created_at', { ascending: false }).limit(50),
    ])
    setOrders(orderData || [])
    setStock(stockData || [])
    setMenuLogs(logData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const csvUrl = `/api/reports/orders?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>Laporan pesanan</h2>
        <div className="form-grid">
          <label>
            Dari
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            Sampai
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <div className="action-row">
          <button onClick={load}>Terapkan filter</button>
          <a className="button" href={csvUrl}>Export CSV</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{new Date(order.created_at).toLocaleString('id-ID')}</td>
                <td>{order.status}</td>
                <td>Rp {Number(order.total || 0).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Stok tersedia</h2>
        <table>
          <thead>
            <tr>
              <th>Menu</th>
              <th>Stok</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((menu) => (
              <tr key={menu.id}>
                <td>{menu.nama}</td>
                <td>{menu.stok}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-card">
        <h2>Log penambahan menu</h2>
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Menu</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {menuLogs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                <td>{log.data_baru?.nama || `Menu #${log.id_menu}`}</td>
                <td>Rp {Number(log.data_baru?.harga || 0).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
