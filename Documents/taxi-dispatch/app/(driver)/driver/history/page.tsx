'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RideStatusBadge } from '@/components/RideStatusBadge'
import { formatPrice } from '@/lib/pricing'
import { useSettings } from '@/context/SettingsContext'
import type { Ride } from '@/lib/types'

type Period = 'today' | 'week' | 'all'

const PAGE_SIZE = 20

function periodStartISO(period: Period): string | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === 'today') { d.setHours(0, 0, 0, 0); return d.toISOString() }
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function DriverHistoryPage() {
  const router = useRouter()
  const { currency } = useSettings()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')
  const [driverId, setDriverId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('drivers').select('id').eq('user_id', user.id).single()
      if (data) setDriverId(data.id)
      else setLoading(false)
    })
  }, [])

  const fetchRides = useCallback(async (drId: string, p: Period, pageNum: number) => {
    setLoading(true)
    const supabase = createClient()
    const start = periodStartISO(p)
    let query = supabase
      .from('rides')
      .select('*, customer:profiles!customer_id(full_name)')
      .eq('driver_id', drId)
      .in('status', ['completed', 'cancelled'])
      .order('requested_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)
    if (start) query = query.gte('requested_at', start)
    const { data } = await query
    const rows = (data ?? []) as Ride[]
    setRides(prev => pageNum === 0 ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!driverId) return
    setPage(0)
    fetchRides(driverId, period, 0)
  }, [driverId, period]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    if (!driverId) return
    const next = page + 1
    setPage(next)
    fetchRides(driverId, period, next)
  }

  const completedRides = rides.filter(r => r.status === 'completed')
  const earnings = completedRides.reduce((sum, r) => sum + (r.final_price ?? 0), 0)

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'all',   label: 'All Time' },
  ]

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/driver/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride History</h1>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-taxi-border mb-4">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              period === key ? 'bg-taxi-yellow text-black' : 'bg-taxi-card text-taxi-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {!loading && (
        <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">Earnings</p>
          <p className="text-3xl font-bold text-taxi-yellow">{formatPrice(earnings, currency)}</p>
          <p className="text-taxi-muted text-sm">
            {completedRides.length} completed · {rides.filter(r => r.status === 'cancelled').length} cancelled
            {hasMore && ' · load more for full totals'}
          </p>
        </div>
      )}

      {loading && page === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {!loading && rides.length === 0 && (
          <p className="text-center text-taxi-muted py-8 text-sm">No rides for this period.</p>
        )}
        {rides.map(ride => {
          const customer = ride.customer as { full_name?: string } | undefined
          return (
            <div key={ride.id} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <RideStatusBadge status={ride.status} />
                <span className="text-taxi-muted text-xs">
                  {new Date(ride.requested_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white">📍 {ride.pickup_address}</p>
              <p className="text-sm text-taxi-muted">→ {ride.destination_address}</p>
              {customer?.full_name && (
                <p className="text-xs text-taxi-muted mt-1">Customer: {customer.full_name}</p>
              )}
              {ride.final_price != null && (
                <p className="text-taxi-yellow font-bold mt-2">{formatPrice(ride.final_price, currency)}</p>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && !loading && (
        <button
          onClick={loadMore}
          className="mt-6 w-full border border-taxi-border text-taxi-muted py-3 rounded-xl text-sm hover:text-white hover:border-taxi-yellow transition"
        >
          Load more
        </button>
      )}
    </div>
  )
}
