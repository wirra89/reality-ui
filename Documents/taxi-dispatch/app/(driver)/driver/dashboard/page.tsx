'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAssignedRide } from '@/hooks/useAssignedRide'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { RideCard } from '@/components/RideCard'
import type { Profile, Driver } from '@/lib/types'

export default function DriverDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [toggling, setToggling] = useState(false)
  const { ride } = useAssignedRide(driverRecord?.id ?? null)

  const isOnline = driverRecord?.status !== 'offline'

  useGPSTracking({
    driverId: driverRecord?.id ?? '',
    driverStatus: driverRecord?.status ?? 'offline',
    enabled: isOnline && !!driverRecord?.id,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: d } = await supabase.from('drivers').select('*').eq('user_id', user.id).single()
      setDriverRecord(d)
    })
  }, [])

  async function toggleOnline() {
    if (!driverRecord) return
    setToggling(true)
    try {
      const supabase = createClient()
      const newStatus = driverRecord.status === 'offline' ? 'online' : 'offline'
      const { data, error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', driverRecord.id)
        .select()
        .single()
      if (error) throw error
      if (data) setDriverRecord(data)
    } catch (err) {
      console.error('Status toggle failed:', err)
    } finally {
      setToggling(false)
    }
  }

  async function handleSignOut() {
    try {
      const supabase = createClient()
      if (driverRecord) {
        await supabase.from('drivers').update({ status: 'offline' }).eq('id', driverRecord.id)
      }
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    router.push('/login')
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-taxi-muted text-sm">Driver</p>
          <h1 className="text-xl font-bold">{profile?.full_name ?? 'Driver'}</h1>
        </div>
        <button onClick={handleSignOut} className="text-taxi-muted text-sm hover:text-white">
          Sign out
        </button>
      </div>

      <div className="bg-taxi-card border border-taxi-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white text-lg">
              {isOnline ? '🟢 You are Online' : '⚫ You are Offline'}
            </p>
            <p className="text-taxi-muted text-sm mt-1">
              {isOnline ? 'GPS active · Accepting rides' : 'Not accepting rides'}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`px-5 py-3 rounded-lg font-bold text-sm transition ${
              isOnline
                ? 'bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900/60'
                : 'bg-taxi-yellow text-black hover:bg-yellow-400'
            } disabled:opacity-50`}
          >
            {toggling ? '...' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {ride && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Active Ride</p>
          <RideCard ride={ride} onClick={() => router.push(`/driver/ride/${ride.id}`)} />
          <button
            onClick={() => router.push(`/driver/ride/${ride.id}`)}
            className="mt-3 w-full bg-taxi-yellow text-black font-bold py-3 rounded-xl"
          >
            Open Ride Controls
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/driver/history')}
        className="mt-4 w-full bg-taxi-card border border-taxi-border text-white py-4 rounded-xl text-sm"
      >
        Ride History
      </button>
    </div>
  )
}
