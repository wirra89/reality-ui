'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

const ROLE_HOME: Record<string, string> = {
  customer: '/customer/dashboard',
  driver: '/driver/dashboard',
  dispatcher: '/dispatcher/dashboard',
  admin: '/dispatcher/dashboard',
}

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Timeout fallback — never spin forever
    const timeout = setTimeout(() => {
      setError('Could not verify your session. Please sign in again.')
    }, 8000)

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      clearTimeout(timeout)

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && allowedRoles.includes(profile.role as UserRole)) {
        setAuthorized(true)
      } else {
        // Redirect to their actual role's home, full reload so proxy handles it
        window.location.href = ROLE_HOME[profile?.role ?? ''] ?? '/login'
      }
    }).catch(() => {
      clearTimeout(timeout)
      window.location.href = '/login'
    })

    return () => clearTimeout(timeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <a href="/login" className="text-taxi-yellow hover:underline text-sm">Back to sign in</a>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
