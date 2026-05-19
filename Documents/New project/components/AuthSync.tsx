'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { syncFromCloud, pushLocalToCloud } from '@/lib/db'

export function AuthSync() {
  useEffect(() => {
    syncFromCloud()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await pushLocalToCloud()
        await syncFromCloud()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
