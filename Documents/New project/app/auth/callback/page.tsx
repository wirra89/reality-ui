'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { pushLocalToCloud, syncFromCloud } from '@/lib/db'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await pushLocalToCloud()
        await syncFromCloud()
      }
      router.push('/')
    }
    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--bg]">
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[--text-dim] mb-2">Reality UI</p>
        <p className="text-sm text-[--text-muted]">Signing you in...</p>
      </div>
    </div>
  )
}
