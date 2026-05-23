'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/pricing'

interface DayStat {
  hour: number
  count: number
}

interface DriverStat {
  name: string
  trips: number
  avg_rating: number | null
  revenue: number
}

interface Stats {
  today: number
  week: number
  month: number
  revenue_today: number
  revenue_month: number
  avg_rating: number | null
  cancel_rate: number
  hourly: DayStat[]
  top_drivers: DriverStat[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      supabase.from('company_settings').select('currency').limit(1).single().then(({ data: s }) => {
        if (s?.currency) setCurrency(s.currency)
      })

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ data: todayRides }, { data: weekRides }, { data: monthRides }] = await Promise.all([
        supabase.from('rides').select('status, final_price, estimated_price, customer_rating, requested_at').gte('requested_at', startOfToday),
        supabase.from('rides').select('status').gte('requested_at', startOfWeek),
        supabase.from('rides').select('status, final_price, estimated_price, customer_rating').gte('requested_at', startOfMonth),
      ])

      const { data: driverStats } = await supabase
        .from('rides')
        .select('driver_id, final_price, estimated_price, customer_rating, status, driver:drivers(profile:profiles(full_name))')
        .eq('status', 'completed')
        .gte('requested_at', startOfMonth)
        .not('driver_id', 'is', null)

      // Compute stats
      const todayArr = todayRides ?? []
      const weekArr = weekRides ?? []
      const monthArr = monthRides ?? []

      const todayCompleted = todayArr.filter(r => r.status === 'completed')
      const monthCompleted = monthArr.filter(r => r.status === 'completed')

      const revenue_today = todayCompleted.reduce((sum, r) => sum + (r.final_price ?? r.estimated_price ?? 0), 0)
      const revenue_month = monthCompleted.reduce((sum, r) => sum + (r.final_price ?? r.estimated_price ?? 0), 0)

      const rated = monthArr.filter(r => r.customer_rating != null)
      const avg_rating = rated.length > 0
        ? rated.reduce((s, r) => s + (r.customer_rating as number), 0) / rated.length
        : null

      const monthTotal = monthArr.length
      const monthCancelled = monthArr.filter(r => r.status === 'cancelled').length
      const cancel_rate = monthTotal > 0 ? (monthCancelled / monthTotal) * 100 : 0

      // Hourly distribution for today
      const hourlyMap: Record<number, number> = {}
      for (let h = 0; h < 24; h++) hourlyMap[h] = 0
      todayArr.forEach(r => {
        const h = new Date(r.requested_at).getHours()
        hourlyMap[h] = (hourlyMap[h] ?? 0) + 1
      })
      const hourly: DayStat[] = Object.entries(hourlyMap).map(([h, count]) => ({ hour: Number(h), count }))

      // Top drivers this month
      type DriverRideRow = {
        driver_id: string
        final_price: number | null
        estimated_price: number | null
        customer_rating: number | null
        status: string
        driver: { profile: { full_name: string | null } | null } | null
      }

      const driverMap = new Map<string, { name: string; trips: number; totalRating: number; ratingCount: number; revenue: number }>()
      ;((driverStats ?? []) as unknown as DriverRideRow[]).forEach(r => {
        const id = r.driver_id
        const name = (r.driver as { profile?: { full_name?: string | null } | null } | null)?.profile?.full_name ?? 'Unknown'
        const existing = driverMap.get(id) ?? { name, trips: 0, totalRating: 0, ratingCount: 0, revenue: 0 }
        existing.trips++
        existing.revenue += r.final_price ?? r.estimated_price ?? 0
        if (r.customer_rating != null) {
          existing.totalRating += r.customer_rating
          existing.ratingCount++
        }
        driverMap.set(id, existing)
      })

      const top_drivers: DriverStat[] = Array.from(driverMap.values())
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 5)
        .map(d => ({
          name: d.name,
          trips: d.trips,
          avg_rating: d.ratingCount > 0 ? d.totalRating / d.ratingCount : null,
          revenue: d.revenue,
        }))

      setStats({
        today: todayArr.length,
        week: weekArr.length,
        month: monthArr.length,
        revenue_today,
        revenue_month,
        avg_rating,
        cancel_rate,
        hourly,
        top_drivers,
      })
      setLoading(false)
    }
    load()
  }, [])

  const maxHourly = stats ? Math.max(...stats.hourly.map(h => h.count), 1) : 1

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/dispatcher/dashboard')} className="text-taxi-muted hover:text-white text-sm">← Dashboard</button>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <span className="text-taxi-muted text-sm ml-auto">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>

      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Rides Today',       value: String(stats.today),                         sub: `${stats.week} this week` },
              { label: 'Rides This Month',  value: String(stats.month),                         sub: `${stats.cancel_rate.toFixed(1)}% cancelled` },
              { label: 'Revenue Today',     value: formatPrice(stats.revenue_today, currency),  sub: `${formatPrice(stats.revenue_month, currency)} this month` },
              { label: 'Avg Rating',        value: stats.avg_rating != null ? `${stats.avg_rating.toFixed(1)} ★` : '—', sub: 'this month' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-taxi-card border border-taxi-border rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-taxi-muted mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-taxi-muted mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Hourly chart */}
          <div className="bg-taxi-card border border-taxi-border rounded-xl p-6 mb-8">
            <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Rides by Hour — Today</p>
            <div className="flex items-end gap-1 h-28">
              {stats.hourly.map(({ hour, count }) => (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-taxi-yellow/80 rounded-t"
                    style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${hour}:00 — ${count} rides`}
                  />
                  {hour % 6 === 0 && (
                    <span className="text-taxi-muted text-xs">{hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top drivers */}
          {stats.top_drivers.length > 0 && (
            <div className="bg-taxi-card border border-taxi-border rounded-xl p-6">
              <p className="text-xs uppercase tracking-wider text-taxi-muted mb-4">Top Drivers — This Month</p>
              <div className="space-y-3">
                {stats.top_drivers.map((d, i) => (
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
