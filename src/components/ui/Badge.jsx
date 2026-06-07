import React from 'react'

const variants = {
  default: 'bg-orange-100 text-warung-primary',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
}

const statusVariant = {
  menunggu_pembayaran: 'warning',
  pending: 'warning',
  diproses: 'info',
  siap: 'purple',
  selesai: 'success',
  paid: 'success',
  dibatalkan: 'danger',
  failed: 'danger',
}

export default function Badge({ variant = 'default', status, children, className = '' }) {
  const resolved = status ? statusVariant[status] || variant : variant
  return (
    <span className={['ui-badge inline-flex items-center rounded-full px-3 py-1 text-xs font-black', variants[resolved] || variants.default, className].join(' ')}>
      {children || status}
    </span>
  )
}
