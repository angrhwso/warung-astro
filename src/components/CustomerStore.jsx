import React, { useEffect, useMemo, useState } from 'react'
import { Bell, Plus, ShoppingCart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import CartDrawer from './CartDrawer.jsx'
import CheckoutButton from './CheckoutButton.jsx'

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function CustomerStore({ mejaId = null, nomorMeja = null }) {
  const storageKey = mejaId ? `cart_meja_${mejaId}` : 'cart_warung'
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : { items: [] }
    } catch {
      return { items: [] }
    }
  })
  const [checkout, setCheckout] = useState({
    tipePesanan: mejaId ? 'dine_in' : 'takeaway',
    customerName: '',
    customerPhone: '',
    alamat: '',
    catatan: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: menuData }] = await Promise.all([
        supabase.from('kategori').select('*').order('urutan'),
        supabase
          .from('menu')
          .select('*, kategori(nama)')
          .eq('tersedia', true)
          .order('created_at', { ascending: false }),
      ])

      setCategories(cats || [])
      setMenus(menuData || [])
      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart))
      window.dispatchEvent(new Event('warung-cart-updated'))
    } catch {}
  }, [cart, storageKey])

  const visibleMenus = useMemo(() => {
    if (filter === 'all') return menus
    return menus.filter((menu) => String(menu.id_kategori) === String(filter))
  }, [filter, menus])

  const subtotal = cart.items.reduce((sum, item) => sum + item.harga * item.jumlah, 0)
  const total = subtotal

  const addToCart = (menu) => {
    setCart((prev) => {
      const existing = prev.items.find((item) => item.id === menu.id)
      const nextItems = existing
        ? prev.items.map((item) =>
            item.id === menu.id
              ? { ...item, jumlah: Math.min(item.jumlah + 1, menu.stok) }
              : item
          )
        : [
            ...prev.items,
            {
              id: menu.id,
              nama: menu.nama,
              harga: menu.harga,
              jumlah: 1,
              stok: menu.stok,
              catatan: '',
            },
          ]

      return { ...prev, items: nextItems }
    })
  }

  const updateQty = (id, qty) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items
        .map((item) =>
          item.id === id
            ? { ...item, jumlah: Math.max(1, Math.min(Number(qty) || 1, item.stok || 99)) }
            : item
        )
        .filter((item) => item.jumlah > 0),
    }))
  }

  const updateItemNote = (id, catatan) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, catatan } : item)),
    }))
  }

  const removeItem = (id) => {
    setCart((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }))
  }

  const resetCart = () => setCart({ items: [] })

  const cartPayload = {
    items: cart.items,
    subtotal,
    total,
    customerName: checkout.customerName,
    customerPhone: checkout.customerPhone,
    catatan: checkout.catatan,
  }

  return (
    <main className="store-shell">
      <section className="store-hero">
        <div>
          <p className="eyebrow">{mejaId ? `Meja ${nomorMeja || mejaId}` : 'Warung makan'}</p>
          <h1>Sajian Hangat untuk Hari yang Hangat</h1>
          <p>Pesan makanan favorit, bayar QRIS, lalu pesanan langsung masuk ke dapur warung.</p>
          <p className="hero-quote">Rasa rumahan, alur modern.</p>
        </div>
        <div className="grid gap-3">
          <a className="admin-link" href="#menu">Pesan Sekarang</a>
          <a className="nav-link text-center" href="/admin/login">Admin</a>
        </div>
      </section>

      <div className="store-layout">
        <section className="menu-panel" id="menu">
          <div className="category-tabs">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={String(filter) === String(category.id) ? 'active' : ''}
                onClick={() => setFilter(category.id)}
              >
                {category.nama}
              </button>
            ))}
            <button className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              <ShoppingCart className="inline h-4 w-4" /> Keranjang ({cart.items.reduce((sum, item) => sum + item.jumlah, 0)})
            </button>
          </div>

          <div className="menu-grid">
            {loading && Array.from({ length: 6 }).map((_, index) => (
              <div className="skeleton aspect-[3/4]" key={index} />
            ))}
            {visibleMenus.map((menu) => (
              <article className="menu-card" key={menu.id}>
                <div className="menu-image">
                  {menu.gambar_url ? (
                    <img src={menu.gambar_url} alt={menu.nama} />
                  ) : (
                    <span>{menu.kategori?.nama || 'Menu'}</span>
                  )}
                </div>
                <div className="menu-content">
                  <div>
                    <p className="menu-category">{menu.kategori?.nama || 'Tanpa kategori'}</p>
                    <h2>{menu.nama}</h2>
                    <span className={`ui-badge ${menu.stok > 0 ? 'stock-ready' : 'stock-empty'}`}>
                      {menu.stok > 0 ? `Stok ${menu.stok}` : 'Habis'}
                    </span>
                    {menu.deskripsi && <p className="menu-desc">{menu.deskripsi}</p>}
                  </div>
                  <div className="menu-footer">
                    <div>
                      <strong>{currency.format(menu.harga)}</strong>
                      <span>{menu.stok > 0 ? 'Siap dipesan' : 'Tidak tersedia'}</span>
                    </div>
                    <button onClick={() => addToCart(menu)} disabled={menu.stok <= 0}>
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart-panel" id="keranjang">
          <div className="cart-head">
            <h2>Keranjang</h2>
            {cart.items.length > 0 && <button onClick={resetCart}>Kosongkan</button>}
          </div>

          {cart.items.length === 0 ? (
            <p className="empty-cart">Belum ada item.</p>
          ) : (
            <div className="cart-items">
              {cart.items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <strong>{item.nama}</strong>
                    <span>{currency.format(item.harga * item.jumlah)}</span>
                  </div>
                  <div className="qty-row">
                    <button onClick={() => (item.jumlah === 1 ? removeItem(item.id) : updateQty(item.id, item.jumlah - 1))}>-</button>
                    <input value={item.jumlah} onChange={(event) => updateQty(item.id, event.target.value)} />
                    <button onClick={() => updateQty(item.id, item.jumlah + 1)}>+</button>
                  </div>
                  <input
                    className="note-input"
                    placeholder="Catatan item"
                    value={item.catatan || ''}
                    onChange={(event) => updateItemNote(item.id, event.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="checkout-form">
            <label>
              Tipe pesanan
              <select
                value={checkout.tipePesanan}
                disabled={Boolean(mejaId)}
                onChange={(event) => setCheckout((prev) => ({ ...prev, tipePesanan: event.target.value }))}
              >
                <option value="dine_in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <label>
              Nama
              <input
                value={checkout.customerName}
                onChange={(event) => setCheckout((prev) => ({ ...prev, customerName: event.target.value }))}
                placeholder="Nama pemesan"
              />
            </label>
            <label>
              Nomor HP
              <input
                value={checkout.customerPhone}
                onChange={(event) => setCheckout((prev) => ({ ...prev, customerPhone: event.target.value }))}
                placeholder="08..."
              />
            </label>
            {checkout.tipePesanan === 'delivery' && (
              <label>
                Alamat delivery
                <textarea
                  value={checkout.alamat}
                  onChange={(event) => setCheckout((prev) => ({ ...prev, alamat: event.target.value }))}
                  placeholder="Alamat lengkap"
                  required
                />
              </label>
            )}
            <label>
              Catatan pesanan
              <textarea
                value={checkout.catatan}
                onChange={(event) => setCheckout((prev) => ({ ...prev, catatan: event.target.value }))}
                placeholder="Contoh: jangan pedas"
              />
            </label>
          </div>

          <div className="total-row">
            <span>Subtotal</span>
            <strong>{currency.format(subtotal)}</strong>
          </div>

          <CheckoutButton
            cart={cartPayload}
            mejaId={mejaId}
            tipePesanan={checkout.tipePesanan}
            alamat={checkout.alamat}
            disabled={cart.items.length === 0 || (checkout.tipePesanan === 'delivery' && !checkout.alamat.trim())}
          />
        </aside>
      </div>

      <CartDrawer
        open={drawerOpen}
        items={cart.items}
        subtotal={subtotal}
        onClose={() => setDrawerOpen(false)}
        onUpdateQty={updateQty}
        onRemove={removeItem}
      >
        <CheckoutButton
          cart={cartPayload}
          mejaId={mejaId}
          tipePesanan={checkout.tipePesanan}
          alamat={checkout.alamat}
          disabled={cart.items.length === 0 || (checkout.tipePesanan === 'delivery' && !checkout.alamat.trim())}
        />
      </CartDrawer>

      {mejaId && (
        <button className="call-waiter" type="button" aria-label="Panggil pelayan">
          <Bell className="h-6 w-6" />
        </button>
      )}
    </main>
  )
}
