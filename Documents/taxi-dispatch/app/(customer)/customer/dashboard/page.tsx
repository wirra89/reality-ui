'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActiveRide } from '@/hooks/useActiveRide'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import type { Profile, Ride } from '@/lib/types'

export default function CustomerDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [scheduledRides, setScheduledRides] = useState<Ride[]>([])
  const { ride, loading } = useActiveRide(userId)
  const prevRideStatusRef = useRef<string | null>(null)

  // Redirect to ride page when a trip completes while on the dashboard
  useEffect(() => {
    if (ride?.status === 'completed' && prevRideStatusRef.current && prevRideStatusRef.current !== 'completed') {
      router.push(`/customer/ride/${ride.id}`)
    }
    prevRideStatusRef.current = ride?.status ?? null
  }, [ride?.status, ride?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      const now = new Date().toISOString()
      const { data: scheduled } = await supabase
        .from('rides')
        .select('*')
        .eq('customer_id', user.id)
        .eq('status', 'requested')
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(3)
      setScheduledRides((scheduled ?? []) as Ride[])
    })
  }, [])

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-taxi-muted text-sm">Welcome back</p>
          <h1 className="text-xl font-bold">{profile?.full_name ?? 'Customer'}</h1>
        </div>
      </div>

      {!loading && ride ? (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Active Ride</p>
          <RideStatusBadge status={ride.status} />
          <div className="mt-3 space-y-1">
            <p className="text-sm text-white">📍 {ride.pickup_address}</p>
            <p className="text-sm text-taxi-muted">→ {ride.destination_address}</p>
          </div>
          <button onClick={() => router.push(`/customer/ride/${ride.id}`)}
            className="mt-4 w-full bg-taxi-yellow text-black font-bold py-3 rounded-lg text-sm">
            Track Ride
          </button>
        </div>
      ) : null}

      {!loading && scheduledRides.length > 0 && (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Upcoming</p>
          <div className="space-y-3">
            {scheduledRides.map(r => (
              <button
                key={r.id}
                onClick={() => router.push(`/customer/ride/${r.id}`)}
                className="w-full flex items-center justify-between text-left hover:opacity-80 transition"
              >
                <div>
                  <p className="text-sm text-white truncate max-w-[220px]">→ {r.destination_address}</p>
                  <p className="text-xs text-blue-300 mt-0.5">
                    {new Date(r.scheduled_at!).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-taxi-muted text-sm">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !ride ? (
        <button onClick={() => router.push('/customer/request')}
          className="w-full bg-taxi-yellow text-black font-bold py-5 rounded-xl text-lg">
          🚕 Request a Taxi
        </button>
      ) : null}

      <button onClick={() => router.push('/customer/history')}
        className="mt-4 w-full bg-taxi-card border border-taxi-border text-white py-4 rounded-xl text-sm">
        Ride History
      </button>
    </div>
  )
}
