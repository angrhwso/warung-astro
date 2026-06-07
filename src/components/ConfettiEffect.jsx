import React, { useEffect, useState } from 'react'

const colors = ['#E76F51', '#F4A261', '#2A9D8F', '#E9C46A', '#E63946']

export default function ConfettiEffect({ active = false }) {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (active) setVisible(true)

    const handler = () => setVisible(true)
    window.addEventListener('warung-payment-success', handler)
    return () => window.removeEventListener('warung-payment-success', handler)
  }, [active])

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => setVisible(false), 3600)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 64 }).map((_, index) => {
        const left = `${Math.random() * 100}%`
        const delay = `${Math.random() * 0.7}s`
        const duration = `${2.4 + Math.random() * 1.4}s`
        const color = colors[index % colors.length]
        return (
          <span
            key={index}
            className="absolute top-[-20px] h-3 w-2 rounded-sm"
            style={{
              left,
              background: color,
              animation: `confetti-fall ${duration} ${delay} ease-in forwards`,
              transform: `rotate(${Math.random() * 180}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}
