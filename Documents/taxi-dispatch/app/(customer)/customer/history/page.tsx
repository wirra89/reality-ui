'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RideCard } from '@/components/RideCard'
import type { Ride } from '@/lib/types'

const PAGE_SIZE = 20

export default function CustomerHistoryPage() {
  const router = useRouter()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadRides(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRides(pageNum: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('rides')
      .select('*, driver:drivers(car_model, car_plate, profile:profiles(full_name))')
      .eq('customer_id', user.id)
      .in('status', ['completed', 'cancelled'])
      .order('requested_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1)

    const rows = (data ?? []) as Ride[]
    setRides(prev => pageNum === 0 ? rows : [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    loadRides(next)
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/customer/dashboard')} className="text-taxi-muted hover:text-white">←</button>
        <h1 className="text-xl font-bold">Ride History</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-taxi-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && rides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-taxi-muted">No completed rides yet.</p>
          <button
            onClick={() => router.push('/customer/request')}
            className="mt-4 bg-taxi-yellow text-black font-bold px-6 py-3 rounded-xl"
          >
            Request your first ride
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rides.map(ride => (
          <RideCard
            key={ride.id}
            ride={ride}
            onClick={() => router.push(`/customer/ride/${ride.id}`)}
          />
        ))}
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
