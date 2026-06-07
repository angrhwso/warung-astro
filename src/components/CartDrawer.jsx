import React from 'react'
import { ShoppingCart, X } from 'lucide-react'
import Button from './ui/Button.jsx'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function CartDrawer({
  open,
  items = [],
  subtotal = 0,
  onClose,
  onUpdateQty,
  onRemove,
  children,
}) {
  if (!open) return null

  return (
    <>
      <button className="cart-drawer-backdrop" type="button" aria-label="Tutup keranjang" onClick={onClose} />
      <aside className="cart-drawer" id="keranjang" aria-label="Keranjang belanja">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="brand-icon"><ShoppingCart className="h-5 w-5" /></span>
            <div>
              <p className="eyebrow">Keranjang</p>
              <h2 className="m-0 text-2xl font-black">Pesananmu</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup keranjang">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-orange-100 text-4xl">🍚</div>
              <p className="font-black">Yuk order dulu...</p>
              <p className="empty-cart">Keranjang masih kosong, nasi hangatnya belum ikut.</p>
            </div>
          </div>
        ) : (
          <div className="cart-items overflow-y-auto pr-1">
            {items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <strong>{item.nama}</strong>
                  <span>{currency.format(item.harga * item.jumlah)}</span>
                </div>
                <div className="qty-row">
                  <button onClick={() => (item.jumlah === 1 ? onRemove(item.id) : onUpdateQty(item.id, item.jumlah - 1))}>-</button>
                  <input value={item.jumlah} onChange={(event) => onUpdateQty(item.id, event.target.value)} aria-label={`Jumlah ${item.nama}`} />
                  <button onClick={() => onUpdateQty(item.id, item.jumlah + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="drawer-footer">
          <div className="total-row">
            <span>Subtotal</span>
            <strong>{currency.format(subtotal)}</strong>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </aside>
    </>
  )
}
