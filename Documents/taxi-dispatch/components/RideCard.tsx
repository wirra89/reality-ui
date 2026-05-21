import type { Ride } from '@/lib/types'
import { RideStatusBadge } from './RideStatusBadge'
import { formatPrice } from '@/lib/pricing'

interface RideCardProps {
  ride: Ride
  onClick?: () => void
  selected?: boolean
  currency?: string
}

export function RideCard({ ride, onClick, selected, currency = 'EUR' }: RideCardProps) {
  const elapsed = Math.floor((Date.now() - new Date(ride.requested_at).getTime()) / 60000)

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 cursor-pointer transition-all ${
        selected
          ? 'border-taxi-yellow bg-taxi-yellow/5'
          : 'border-taxi-border bg-taxi-card hover:border-taxi-yellow/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <RideStatusBadge status={ride.status} />
        <span className="text-xs text-taxi-muted">{elapsed}m ago</span>
      </div>
      <div className="space-y-1 mb-2">
        <p className="text-sm text-white flex items-center gap-1.5">
          <span className="text-taxi-yellow text-xs">●</span>
          {ride.pickup_address ?? 'Unknown pickup'}
        </p>
        <p className="text-sm text-taxi-muted flex items-center gap-1.5">
          <span className="text-xs">→</span>
          {ride.destination_address ?? 'Unknown destination'}
        </p>
      </div>
      {ride.estimated_price && (
        <p className="text-taxi-yellow text-sm font-bold">
          {formatPrice(ride.estimated_price, currency)}
        </p>
      )}
    </div>
  )
}
