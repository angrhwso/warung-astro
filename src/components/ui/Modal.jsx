import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button.jsx'

export default function Modal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="modal-backdrop grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg animate-scale-fade rounded-3xl border border-warung-line bg-warung-paper p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-2xl font-black text-warung-text">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup modal">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
