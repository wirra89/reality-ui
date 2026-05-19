'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/db'

export function SyncStatus() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return null

  if (!session) {
    return (
      <button
        onClick={() => router.push('/auth')}
        className="text-[10px] uppercase tracking-wider text-[--text-dim] transition-colors hover:text-[--accent]"
      >
        ↑ Sync to cloud
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
        <span className="text-[10px] text-[--text-dim]">{session.user.email}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="text-[10px] text-[--text-dim] transition-colors hover:text-rose-400/70"
      >
        Sign out
      </button>
    </div>
  )
}
