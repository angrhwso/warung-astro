import React, { useEffect, useState } from 'react'

const colors = ['#E76F51', '#F4A261', '#2A9D8F', '#E9C46A', '#E63946']

export default function ConfettiEffect({ active = false }) {
  const [visible, setVisible] = useState(active)
  const [pieces, setPieces] = useState([])

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

  useEffect(() => {
    if (!visible) {
      setPieces([])
      return
    }

    // Generate confetti only on the client so SSR markup stays deterministic.
    setPieces(
      Array.from({ length: 64 }, (_, index) => ({
        id: index,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.7}s`,
        duration: `${2.4 + Math.random() * 1.4}s`,
        rotation: `${Math.random() * 180}deg`,
        color: colors[index % colors.length],
      }))
    )
  }, [visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-[-20px] h-3 w-2 rounded-sm"
          style={{
            left: piece.left,
            background: piece.color,
            animation: `confetti-fall ${piece.duration} ${piece.delay} ease-in forwards`,
            transform: `rotate(${piece.rotation})`,
          }}
        />
      ))}
    </div>
  )
}
