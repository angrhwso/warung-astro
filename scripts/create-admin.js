import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

const email = process.argv[2] || 'admin@warung.test'
const password = process.argv[3] || 'AdminPass123!'

async function run() {
  try {
    const res = await admin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role: 'admin' },
      email_confirm: true
    })
    console.log('created:', res)
  } catch (err) {
    console.error('error creating user', err)
  }
}

run()
