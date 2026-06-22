function normalizePhone(phone) {
  let digits = String(phone || '').replace(/[^\d]/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}

function getBaseUrl() {
  return (
    import.meta.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    import.meta.env.SITE ||
    process.env.SITE ||
    ''
  )
}

function buildTrackingUrl(id, trackingUrl) {
  if (trackingUrl) return trackingUrl

  const baseUrl = getBaseUrl()
  if (!baseUrl) return `/tracking/${id}`

  return new URL(`/tracking/${id}`, baseUrl).toString()
}

export async function sendCustomerWhatsappNotification({ customerPhone, id, status, trackingUrl }) {
  const token = import.meta.env.FONNTE_TOKEN || process.env.FONNTE_TOKEN
  const target = normalizePhone(customerPhone)

  if (!token || !target || !id || !status) {
    return { ok: false, skipped: true }
  }

  const message = [
    'Warung Rosonyoto',
    '',
    `Pesanan #${id}`,
    '',
    'Status:',
    status,
    '',
    'Lacak pesanan:',
    buildTrackingUrl(id, trackingUrl),
  ].join('\n')

  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
    },
    body: new URLSearchParams({
      target,
      message,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Gagal mengirim WhatsApp customer')
  }

  return data
}
