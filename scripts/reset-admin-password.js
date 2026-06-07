import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-admin-password.js admin@example.com NewP@ssw0rd')
  process.exit(1)
}

async function run() {
  try {
    // list users (may be paginated)
    const list = await admin.auth.admin.listUsers()
    const users = list?.data?.users || list?.users || list?.data || []
    const user = users.find(u => u.email === email)
    if (!user) {
      console.error('User not found:', email)
      process.exit(1)
    }

    // update password by id
    const res = await admin.auth.admin.updateUserById(user.id, { password: newPassword })
    console.log('updated:', res)
  } catch (err) {
    console.error('error resetting password', err)
  }
}

run()
