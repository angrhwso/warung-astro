import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminGuard(props) {
  const { children } = props
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session) {
        window.location.href = '/admin/login'
        return
      }
      setLoading(false)
    }
    check()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Memeriksa autentikasi...</div>
  return <div>{children}</div>
}
