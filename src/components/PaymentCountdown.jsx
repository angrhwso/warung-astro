import React, { useEffect, useMemo, useRef, useState } from 'react'

const DURATION_SECONDS = 15 * 60

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`
}

function getTone(remainingSeconds) {
  if (remainingSeconds < 2 * 60) {
    return { ring: '#ef4444', text: '#ef4444', label: 'Hampir habis' }
  }
  if (remainingSeconds < 5 * 60) {
    return { ring: '#f59e0b', text: '#f59e0b', label: 'Segera bayar' }
  }
  return { ring: '#2A9D8F', text: '#2A9D8F', label: 'Aman' }
}

export default function PaymentCountdown({ createdAt, onExpire, className = '' }) {
  const deadline = useMemo(() => {
    const base = createdAt ? new Date(createdAt).getTime() : Date.now()
    return base + DURATION_SECONDS * 1000
  }, [createdAt])

  const expiredRef = useRef(false)
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((deadline - Date.now()) / 1000)))

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
      setRemaining(next)

      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true
        if (typeof onExpire === 'function') onExpire()
      }
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [deadline, onExpire])

  const tone = getTone(remaining)
  const pct = Math.max(0, Math.min(100, (remaining / DURATION_SECONDS) * 100))
  const circumference = 2 * Math.PI * 54
  const dash = circumference - (pct / 100) * circumference

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`.trim()}>
      <div className="relative h-56 w-56 sm:h-64 sm:w-64">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(43,31,26,0.08)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={tone.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
            className="transition-all duration-500 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-[0.28em] text-[#e76f51]">Timer</span>
          <div className="mt-2 text-4xl font-black tracking-tight transition-colors duration-500 sm:text-5xl" style={{ color: tone.text }}>
            {formatSeconds(remaining)}
          </div>
          <span className="mt-1 text-sm font-semibold text-slate-500">{tone.label}</span>
        </div>
      </div>
    </div>
  )
}
