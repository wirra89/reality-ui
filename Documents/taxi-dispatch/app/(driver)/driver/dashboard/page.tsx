'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAssignedRide } from '@/hooks/useAssignedRide'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/context/ToastContext'
import { useSettings } from '@/context/SettingsContext'
import { RideCard } from '@/components/RideCard'
import { RideRequestAlert } from '@/components/RideRequestAlert'
import type { Profile, Driver } from '@/lib/types'

export default function DriverDashboard() {
  const router = useRouter()
  const { showToast } = useToast()
  const { currency } = useSettings()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverRecord, setDriverRecord] = useState<Driver | null>(null)
  const [toggling, setToggling] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const { ride } = useAssignedRide(driverRecord?.id ?? null)

  // Track the last seen assigned ride ID to detect a new assignment
  const lastAlertedRideId = useRef<string | null>(null)

  const isOnline = driverRecord?.status !== 'offline'

  useGPSTracking({
    driverId: driverRecord?.id ?? '',
    driverStatus: driverRecord?.status ?? 'offline',
    enabled: isOnline && !!driverRecord?.id,
    onError: (msg) => showToast(msg, 'warning'),
  })

  usePushNotifications(driverRecord?.id ?? null, isOnline)

  // Show alert when a new ride is assigned (status === 'assigned')
  useEffect(() => {
    if (ride?.status === 'assigned' && ride.id !== lastAlertedRideId.current) {
      lastAlertedRideId.current = ride.id
      setShowAlert(true)
    }
    // If the ride moves past 'assigned', close the alert
    if (ride && ride.status !== 'assigned') {
      setShowAlert(false)
    }
    if (!ride) {
      setShowAlert(false)
    }
  }, [ride?.id, ride?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: d } = await supabase.from('drivers').select('*').eq('user_id', user.id).single()
      setDriverRecord(d)
      if (!d) return
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: tr } = await supabase
        .from('rides').select('final_price')
        .eq('driver_id', d.id).eq('status', 'completed')
        .gte('completed_at', today.toISOString())
      const trRides = (tr ?? []) as { final_price: number | null }[]
      setTodayEarnings(trRides.reduce((s, r) => s + (r.final_price ?? 0), 0))
      setTodayCount(trRides.length)
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

  async function handleAccept() {
    setShowAlert(false)
    if (ride) router.push(`/driver/ride/${ride.id}`)
  }

  async function handleReject() {
    if (!ride || !driverRecord) return
    setShowAlert(false)
    // Clear so the same ride ID can trigger a new alert if reassigned
    lastAlertedRideId.current = null
    try {
      const supabase = createClient()
      // Unassign the ride: set back to requested, clear driver, reset driver status
      await supabase
        .from('rides')
        .update({ status: 'requested', driver_id: null, assigned_at: null })
        .eq('id', ride.id)
      await supabase
        .from('drivers')
        .update({ status: 'online' })
        .eq('id', driverRecord.id)
      setDriverRecord(prev => prev ? { ...prev, status: 'online' } : null)
    } catch (err) {
      console.error('Reject ride failed:', err)
    }
  }


  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-taxi-muted text-sm">Driver</p>
          <h1 className="text-xl font-bold">{profile?.full_name ?? 'Driver'}</h1>
        </div>
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

      {/* Today's earnings */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Today's Earnings</p>
          <p className="text-xl font-bold text-taxi-yellow">
            {new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(todayEarnings)}
          </p>
        </div>
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Trips Today</p>
          <p className="text-xl font-bold text-white">{todayCount}</p>
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

      {showAlert && ride && (
        <RideRequestAlert
          ride={ride}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
