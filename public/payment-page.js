(function () {
  const configEl = document.getElementById('payment-config')
  if (!configEl) return

  const snapToken = String(configEl.dataset.snapToken || '')
  const deadlineTimestamp = Number(configEl.dataset.deadline || 0)
  const clientKey = String(configEl.dataset.midtransClientKey || '')
  const isProduction = String(configEl.dataset.midtransIsProduction || 'false') === 'true'

  const countdownEl = document.getElementById('countdownDisplay')
  const statusBadgeEl = document.getElementById('payment-status-badge')
  const statusTextEl = document.getElementById('statusText')
  const snapBox = document.getElementById('snapBox')
  const openPaymentButton = document.getElementById('openPaymentButton')
  const simulatePaymentButton = document.getElementById('simulatePaymentButton')

  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const minutes = String(Math.floor(total / 60)).padStart(2, '0')
    const seconds = String(total % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  function tickCountdown() {
    if (!countdownEl || !deadlineTimestamp) return
    const remaining = deadlineTimestamp - Date.now()
    countdownEl.textContent = formatCountdown(remaining)
    countdownEl.style.color =
      remaining < 2 * 60 * 1000 ? '#ef4444' : remaining < 5 * 60 * 1000 ? '#f59e0b' : '#2A9D8F'
  }

  function loadSnapScript() {
    if (window.snap) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.async = true
      script.src = isProduction
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', clientKey)
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  async function openSnap() {
    if (!snapToken) {
      if (snapBox) snapBox.textContent = 'Snap token belum tersedia.'
      if (statusBadgeEl) statusBadgeEl.textContent = 'Snap token kosong'
      if (statusTextEl) statusTextEl.textContent = 'Pembayaran belum siap.'
      return
    }

    try {
      if (snapBox) snapBox.textContent = 'Memuat Snap Midtrans...'
      await loadSnapScript()
      if (!window.snap || typeof window.snap.pay !== 'function') {
        throw new Error('Snap Midtrans belum siap')
      }

      window.snap.pay(snapToken)
    } catch (error) {
      console.error(error)
      if (snapBox) snapBox.textContent = 'Gagal membuka Snap Midtrans.'
      if (statusTextEl) statusTextEl.textContent = 'Gagal membuka pembayaran.'
    }
  }

  async function simulatePayment() {
    if (!snapToken) {
      if (snapBox) snapBox.textContent = 'Snap token belum tersedia.'
      return
    }

    try {
      if (simulatePaymentButton) {
        simulatePaymentButton.disabled = true
        simulatePaymentButton.textContent = 'Memproses simulasi...'
      }

      const response = await fetch('/api/midtrans/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pesanan: Number(configEl.dataset.orderId || 0) || null }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) throw new Error(data.error || 'Simulasi pembayaran gagal')

      if (statusBadgeEl) statusBadgeEl.textContent = 'Pesanan Sedang Diproses'
      if (statusTextEl) statusTextEl.textContent = 'Pesanan Sedang Diproses'
      window.location.reload()
    } catch (error) {
      console.error(error)
      if (snapBox) snapBox.textContent = 'Simulasi pembayaran gagal.'
      if (simulatePaymentButton) {
        simulatePaymentButton.disabled = false
        simulatePaymentButton.textContent = 'Simulasi Pembayaran Berhasil'
      }
    }
  }

  openPaymentButton?.addEventListener('click', openSnap)
  simulatePaymentButton?.addEventListener('click', simulatePayment)
  tickCountdown()
  window.setInterval(tickCountdown, 1000)
})()
