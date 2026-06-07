import React from 'react'
import { Toaster } from 'sonner'

export default function Toast() {
  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        className: 'toast-shell',
        duration: 3000,
      }}
    />
  )
}
