(function () {
  const configEl = document.getElementById('payment-config')
  if (!configEl) return

  const snapToken = String(configEl.dataset.snapToken || '')
  const clientKey = String(configEl.dataset.midtransClientKey || '')
  const isProduction = String(configEl.dataset.midtransIsProduction || 'false') === 'true'
  const statusEl = document.getElementById('payment-status')

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
      if (statusEl) statusEl.textContent = 'Snap token belum tersedia.'
      return
    }

    try {
      await loadSnapScript()
      if (!window.snap || typeof window.snap.pay !== 'function') {
        throw new Error('Snap Midtrans belum siap')
      }

      window.snap.pay(snapToken)
    } catch (error) {
      console.error(error)
      if (statusEl) statusEl.textContent = 'Gagal membuka Snap Midtrans.'
    }
  }

  openSnap()
})()
