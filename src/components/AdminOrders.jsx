import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const statuses = ['menunggu_pembayaran', 'diproses', 'siap', 'selesai', 'dibatalkan']
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')

  async function load() {
    const { data } = await supabase
      .from('pesanan')
      .select('*, meja(nomor_meja), detail_pesanan(*, menu(nama))')
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders(data || [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pesanan' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const updateStatus = async (id, status) => {
    await supabase.from('pesanan').update({ status }).eq('id', id)
    load()
  }

  const visibleOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter)

  return (
    <section className="admin-card">
      <div className="category-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Semua</button>
        {statuses.map((status) => (
          <button className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>
            {status}
          </button>
        ))}
      </div>

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
              <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
              <td>
                <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                  {statuses.map((status) => <option value={status} key={status}>{status}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
