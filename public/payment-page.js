(function () {
  const configEl = document.getElementById('payment-config')
  if (!configEl) return

  const ORDER_ID = String(configEl.dataset.orderId || '')
  const SNAP_TOKEN = String(configEl.dataset.snapToken || '')
  const DEADLINE_TIMESTAMP = Number(configEl.dataset.deadline || 0) || (Date.now() + 15 * 60 * 1000)
  const WHATSAPP_CS = String(configEl.dataset.whatsappCs || '')
  const IS_DEV = String(configEl.dataset.isDev || 'false') === 'true'
  const MIDTRANS_CLIENT_KEY = String(configEl.dataset.midtransClientKey || '')
  const MIDTRANS_IS_PRODUCTION = String(configEl.dataset.midtransIsProduction || 'false') === 'true'

  const countdownEl = document.getElementById('countdownDisplay')
  const noteTextEl = document.getElementById('noteText')
  const timeoutAreaEl = document.getElementById('timeoutArea')
  const statusBadgeEl = document.getElementById('statusBadge')
  const openPaymentButton = document.getElementById('openPaymentButton')
  const refreshButton = document.getElementById('refreshButton')
  const whatsappButton = document.getElementById('whatsappButton')
  const simulateButton = document.getElementById('simulateButton')
  const snapBox = document.getElementById('snapBox')

  function normalizePhone(value) {
    return String(value || '').replace(/[^\d]/g, '')
  }

  function waLink(message) {
    const phone = normalizePhone(WHATSAPP_CS)
    if (!phone) return '#'
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  if (whatsappButton && WHATSAPP_CS) {
    whatsappButton.href = waLink(`Halo Kasir, saya ingin konfirmasi pembayaran untuk pesanan #${ORDER_ID}.`)
  }

  function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000))
    const minutes = String(Math.floor(total / 60)).padStart(2, '0')
    const seconds = String(total % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  function tickCountdown() {
    const remaining = DEADLINE_TIMESTAMP - Date.now()
    if (countdownEl) {
      countdownEl.textContent = formatCountdown(remaining)
      countdownEl.style.color =
        remaining < 2 * 60 * 1000 ? '#ef4444' : remaining < 5 * 60 * 1000 ? '#f59e0b' : '#2A9D8F'
    }

    if (remaining <= 0 && timeoutAreaEl) {
      if (noteTextEl) noteTextEl.textContent = 'Waktu habis, silakan hubungi kasir.'
      timeoutAreaEl.innerHTML = `
        <a class="inline-flex items-center justify-center rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(37,211,102,0.22)]" href="${waLink(`Halo Kasir, waktu pembayaran pesanan #${ORDER_ID} sudah habis. Mohon bantu batalkan pesanan.`)}" target="_blank" rel="noreferrer">
          Hubungi Kasir
        </a>
      `
    }
  }

  function loadSnapScript() {
    if (window.snap) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.async = true
      script.src = MIDTRANS_IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY)
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  function openPayment() {
    if (!SNAP_TOKEN) {
      if (snapBox) snapBox.textContent = 'Metode pembayaran sedang maintenance, silakan coba lagi nanti.'
      return
    }

    loadSnapScript()
      .then(() => {
        if (!window.snap || typeof window.snap.pay !== 'function') {
          throw new Error('Snap Midtrans belum siap')
        }

        window.snap.pay(SNAP_TOKEN, {
          onSuccess: () => {
            window.location.href = `/pembayaran/sukses/${ORDER_ID}`
          },
          onPending: () => {
            if (noteTextEl) noteTextEl.textContent = 'Menunggu konfirmasi pembayaran.'
          },
          onError: () => {
            if (noteTextEl) noteTextEl.textContent = 'Gagal membuka instruksi pembayaran.'
          },
          onClose: () => {
            if (noteTextEl) noteTextEl.textContent = 'Instruksi pembayaran ditutup.'
          },
        })
      })
      .catch(() => {
        if (snapBox) snapBox.textContent = 'Metode pembayaran sedang maintenance, silakan coba lagi nanti.'
      })
  }

  async function refreshStatus() {
    try {
      const url = new URL('/api/cek-status', window.location.origin)
      url.searchParams.set('id', ORDER_ID)
      const response = await fetch(url, { cache: 'no-store' })
      const data = await response.json()
      const status = String(data?.pembayaran?.status || '').toLowerCase()

      if (statusBadgeEl) {
        if (['paid', 'settlement', 'capture'].includes(status)) {
          statusBadgeEl.textContent = 'Pembayaran diterima'
        } else if (status === 'failed') {
          statusBadgeEl.textContent = 'Pembayaran gagal'
        } else {
          statusBadgeEl.textContent = 'Menunggu pembayaran'
        }
      }

      if (['paid', 'settlement', 'capture'].includes(status)) {
        window.location.href = `/pembayaran/sukses/${ORDER_ID}`
      }
    } catch (error) {
      console.error(error)
    }
  }

  function simulatePay() {
    if (!IS_DEV) return
    window.location.href = `/pembayaran/sukses/${ORDER_ID}?testing=1`
  }

  openPaymentButton?.addEventListener('click', openPayment)
  refreshButton?.addEventListener('click', refreshStatus)
  simulateButton?.addEventListener('click', simulatePay)

  tickCountdown()
  window.setInterval(tickCountdown, 1000)
  window.setInterval(refreshStatus, 5000)
})()
