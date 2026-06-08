// src/components/CheckoutButton.jsx
import { useState } from 'react'

export default function CheckoutButton({ cart, mejaId, tipePesanan, alamat, metodePembayaran = 'midtrans', disabled = false }) {
  const [loading, setLoading] = useState(false)

  const getTestingMode = () => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('warung-midtrans-testing') === '1'
    } catch {
      return false
    }
  }

  const handleCheckout = async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      const payload = {
        cart: cart.items.map(i => ({ id_menu: i.id, jumlah: i.jumlah, harga: i.harga, catatan: i.catatan })),
        tipe_pesanan: tipePesanan,
        id_meja: mejaId || null,
        alamat_delivery: alamat || null,
        customer_name: cart.customerName || null,
        customer_phone: cart.customerPhone || null,
        catatan: cart.catatan || null,
        metode_pembayaran: metodePembayaran,
      }

      const res = await fetch('/api/midtrans/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout gagal')

      // redirect to payment page (will show QR/links)
      const pesananId = data.pesanan?.id || (data.midtrans && data.midtrans.order_id?.split('-')[1])
      const testing = getTestingMode() ? '?testing=1' : ''
      window.location.href = `/pembayaran/${pesananId}${testing}`
    } catch (err) {
      console.error(err)
      alert('Gagal melakukan checkout: ' + (err.message || err))
      setLoading(false)
    }
  }

  return (
    <button className="primary-button" onClick={handleCheckout} disabled={loading || disabled}>
      {loading ? 'Memproses...' : metodePembayaran === 'kasir' ? 'Kirim ke Kasir' : 'Lanjut ke Pembayaran'}
    </button>
  )
}
