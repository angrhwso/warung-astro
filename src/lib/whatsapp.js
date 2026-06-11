const runtimeEnv = typeof process !== 'undefined' ? process.env : {}

function getWhatsappConfig() {
  const apiKey = import.meta.env.WHATSAPP_API_KEY || runtimeEnv.WHATSAPP_API_KEY
  const adminNumber = import.meta.env.ADMIN_WHATSAPP_NUMBER || runtimeEnv.ADMIN_WHATSAPP_NUMBER
  return { apiKey, adminNumber }
}

export function formatAdminOrderMessage({ orderId, total, items = [] }) {
  const lines = items.map((item) => `- ${item.jumlah}x ${item.nama}`).join('\n')
  return [
    `Pesanan baru: #${orderId}`,
    `Total: Rp ${Number(total || 0).toLocaleString('id-ID')}`,
    'Menu:',
    lines || '-',
  ].join('\n')
}

export async function sendAdminWhatsappNotification({ orderId, total, items = [] }) {
  const { apiKey, adminNumber } = getWhatsappConfig()
  if (!apiKey || !adminNumber) {
    return { ok: false, skipped: true, error: 'WHATSAPP_API_KEY atau ADMIN_WHATSAPP_NUMBER belum diset' }
  }

  const message = formatAdminOrderMessage({ orderId, total, items })
  const response = await fetch(
    `https://api.callmebot.com/whatsapp.php?phone=${adminNumber}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  )
  const body = await response.text()

  return {
    ok: response.ok,
    status: response.status,
    body,
    message,
  }
}
