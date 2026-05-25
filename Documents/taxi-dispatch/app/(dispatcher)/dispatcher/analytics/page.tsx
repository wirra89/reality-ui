'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/context/SettingsContext'
import { formatPrice } from '@/lib/pricing'

type Period = 'today' | 'week' | 'month'

interface TrendPoint {
  label: string
  revenue: number
  count: number
  cancelled: number
}

interface DriverStat {
  name: string
  trips: number
  avg_rating: number | null
  revenue: number
}

interface PeriodStats {
  totalRides: number
  revenue: number
  cancelRate: number
  avgRating: number | null
  trend: TrendPoint[]
  topDrivers: DriverStat[]
}

type RideRow = {
  status: string
  final_price: number | null
  estimated_price: number | null
  customer_rating: number | null
  requested_at: string
}

type DriverRideRow = {
  driver_id: string
  final_price: number | null
  estimated_price: number | null
  customer_rating: number | null
  driver: { profile: { full_name: string | null } | null } | null
}

function periodStart(p: Period): Date {
  const now = new Date()
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === 'week') return new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function buildTrend(rides: RideRow[], period: Period): TrendPoint[] {
  const now = new Date()
  if (period === 'today') {
    const map: Record<number, TrendPoint> = {}
    for (let h = 0; h < 24; h++) map[h] = { label: h % 6 === 0 ? `${h}h` : '', revenue: 0, count: 0, cancelled: 0 }
    rides.forEach(r => {
      const h = new Date(r.requested_at).getHours()
      map[h].count++
      if (r.status === 'cancelled') map[h].cancelled++
      if (r.status === 'completed') map[h].revenue += r.final_price ?? r.estimated_price ?? 0
    })
    return Object.values(map)
  }
  if (period === 'week') {
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const map: Record<string, TrendPoint> = {}
    DAY_LABELS.forEach(l => { map[l] = { label: l, revenue: 0, count: 0, cancelled: 0 } })
    rides.forEach(r => {
      const label = DAY_LABELS[(new Date(r.requested_at).getDay() + 6) % 7]
      map[label].count++
      if (r.status === 'cancelled') map[label].cancelled++
      if (r.status === 'completed') map[label].revenue += r.final_price ?? r.estimated_price ?? 0
    })
    return Object.values(map)
  }
  // month — daily
  const daysInMonth = now.getDate()
  const map: Record<string, TrendPoint> = {}
  for (let d = 1; d <= daysInMonth; d++) map[String(d)] = { label: d % 5 === 1 ? String(d) : '', revenue: 0, count: 0, cancelled: 0 }
  rides.forEach(r => {
    const label = String(new Date(r.requested_at).getDate())
    if (map[label]) {
      map[label].count++
      if (r.status === 'cancelled') map[label].cancelled++
      if (r.status === 'completed') map[label].revenue += r.final_price ?? r.estimated_price ?? 0
    }
  })
  return Object.values(map)
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { currency } = useSettings()
  const [period, setPeriod] = useState<Period>('today')
  const [stats, setStats] = useState<PeriodStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    try {
    const supabase = createClient()
    const start = periodStart(p).toISOString()

    const [{ data: rides }, { data: driverRides }] = await Promise.all([
      supabase.from('rides')
        .select('status, final_price, estimated_price, customer_rating, requested_at')
        .gte('requested_at', start),
      supabase.from('rides')
        .select('driver_id, final_price, estimated_price, customer_rating, driver:drivers(profile:profiles(full_name))')
        .eq('status', 'completed')
        .gte('requested_at', start)
        .not('driver_id', 'is', null),
    ])

    const ridesArr = (rides ?? []) as RideRow[]
    const completed = ridesArr.filter(r => r.status === 'completed')
    const cancelled = ridesArr.filter(r => r.status === 'cancelled')
    const revenue = completed.reduce((s, r) => s + (r.final_price ?? r.estimated_price ?? 0), 0)
    const cancelRate = ridesArr.length > 0 ? (cancelled.length / ridesArr.length) * 100 : 0
    const rated = ridesArr.filter(r => r.customer_rating != null)
    const avgRating = rated.length > 0
      ? rated.reduce((s, r) => s + (r.customer_rating as number), 0) / rated.length
      : null

    // Top drivers
    const driverMap = new Map<string, { name: string; trips: number; totalRating: number; ratingCount: number; revenue: number }>()
    ;((driverRides ?? []) as unknown as DriverRideRow[]).forEach(r => {
      const id = r.driver_id
      const name = (r.driver as { profile?: { full_name?: string | null } | null } | null)?.profile?.full_name ?? 'Unknown'
      const ex = driverMap.get(id) ?? { name, trips: 0, totalRating: 0, ratingCount: 0, revenue: 0 }
      ex.trips++
      ex.revenue += r.final_price ?? r.estimated_price ?? 0
      if (r.customer_rating != null) { ex.totalRating += r.customer_rating; ex.ratingCount++ }
      driverMap.set(id, ex)
    })
    const topDrivers: DriverStat[] = Array.from(driverMap.values())
      .sort((a, b) => b.trips - a.trips).slice(0, 5)
      .map(d => ({ name: d.name, trips: d.trips, avg_rating: d.ratingCount > 0 ? d.totalRating / d.ratingCount : null, revenue: d.revenue }))

    setStats({ totalRides: ridesArr.length, revenue, cancelRate, avgRating, trend: buildTrend(ridesArr, p), topDrivers })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ]

  const maxCount   = stats ? Math.max(...stats.trend.map(t => t.count), 1) : 1
  const maxRevenue = stats ? Math.max(...stats.trend.map(t => t.revenue), 1) : 1
  const maxCancel  = stats ? Math.max(...stats.trend.map(t => t.cancelled), 1) : 1

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dispatcher/dashboard')} className="text-taxi-muted hover:text-white text-sm">← Dashboard</button>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Period selector */}
      <div className="flex rounded-lg overflow-hidden border border-taxi-border mb-8 w-fit">
        {PERIODS.map(({ key, label }) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              period === key ? 'bg-taxi-yellow text-black' : 'bg-taxi-card text-taxi-muted hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {stats && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Rides',    value: String(stats.totalRides),                        sub: period === 'today' ? 'today' : period === 'week' ? 'last 7 days' : 'this month' },
              { label: 'Cancel Rate',    value: `${stats.cancelRate.toFixed(1)}%`,               sub: 'of all rides' },
              { label: 'Revenue',        value: formatPrice(stats.revenue, currency),             sub: period === 'today' ? 'today' : period === 'week' ? 'last 7 days' : 'this month' },
              { label: 'Avg Rating',     value: stats.avgRating != null ? `${stats.avgRating.toFixed(1)} ★` : '—', sub: 'customer rating' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-taxi-muted mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Rides trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-6">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Rides — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-28">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-taxi-yellow/80 rounded-t"
                    style={{ height: `${(pt.count / maxCount) * 100}%`, minHeight: pt.count > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${pt.count} rides`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Revenue trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-6">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Revenue — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-28">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-green-500/70 rounded-t"
                    style={{ height: `${(pt.revenue / maxRevenue) * 100}%`, minHeight: pt.revenue > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${formatPrice(pt.revenue, currency)}`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Cancellations trend chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-8">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">
              Cancellations — {period === 'today' ? 'By Hour' : 'By Day'}
            </p>
            <div className="flex items-end gap-1 h-20">
              {stats.trend.map((pt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-red-500/60 rounded-t"
                    style={{ height: `${(pt.cancelled / maxCancel) * 100}%`, minHeight: pt.cancelled > 0 ? '4px' : '0' }}
                    title={`${pt.label || i} — ${pt.cancelled} cancelled`}
                  />
                  {pt.label && <span className="text-taxi-muted text-xs">{pt.label}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Top drivers */}
          {stats.topDrivers.length > 0 && (
            <div className="bg-taxi-card border border-taxi-border rounded-xl p-6">
              <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Top Drivers</p>
              <div className="space-y-3">
                {stats.topDrivers.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-4">
                    <span className="text-taxi-muted text-sm w-5 text-right">{i + 1}.</span>
                    <span className="text-white font-medium flex-1 truncate">{d.name}</span>
                    <span className="text-taxi-muted text-sm">{d.trips} trips</span>
                    <span className="text-taxi-yellow text-sm w-12 text-right">
                      {d.avg_rating != null ? `${d.avg_rating.toFixed(1)} ★` : '—'}
                    </span>
                    <span className="text-green-400 text-sm w-20 text-right">{formatPrice(d.revenue, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
