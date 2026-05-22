'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DriverStatusBadge } from '@/components/DriverStatusBadge'
import type { Driver } from '@/lib/types'

export default function DispatcherDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('drivers')
      .select('*, profile:profiles(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDrivers((data ?? []) as Driver[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Drivers ({drivers.length})</h1>

      {loading && <p className="text-taxi-muted">Loading...</p>}

      <div className="grid gap-3">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-taxi-border flex items-center justify-center font-bold text-white">
              {driver.profile?.full_name?.[0] ?? 'D'}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{driver.profile?.full_name ?? 'Unknown'}</p>
              <p className="text-taxi-muted text-sm">{driver.car_model ?? '—'} · {driver.car_plate ?? '—'}</p>
              {driver.profile?.phone && (
                <p className="text-taxi-muted text-xs">{driver.profile.phone}</p>
              )}
            </div>
            <DriverStatusBadge status={driver.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
