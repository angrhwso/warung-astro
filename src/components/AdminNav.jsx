const links = [
  ['/admin/dashboard', 'Dashboard'],
  ['/admin/orders', 'Pesanan'],
  ['/admin/menu', 'Menu'],
  ['/admin/meja', 'Meja'],
  ['/admin/reports', 'Laporan'],
]

export default function AdminNav({ active }) {
  return (
    <nav className="admin-tabs">
      {links.map(([href, label]) => (
        <a className={active === href ? 'active' : ''} href={href} key={href}>
          {label}
        </a>
      ))}
    </nav>
  )
}
