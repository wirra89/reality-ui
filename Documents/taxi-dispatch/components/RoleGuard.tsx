'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
        router.push('/login')
        return
      }

      setAuthorized(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
