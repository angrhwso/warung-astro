import { createClient } from '@supabase/supabase-js'

const runtimeEnv = typeof process !== 'undefined' ? process.env : {}
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || runtimeEnv.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || runtimeEnv.PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || runtimeEnv.SUPABASE_SERVICE_ROLE_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Untuk admin (server-side saja)
export const supabaseAdmin = supabaseServiceRoleKey
  ? (supabaseUrl ? createClient(supabaseUrl, supabaseServiceRoleKey) : null)
  : null
