import { rideStatusColor, rideStatusLabel } from '@/lib/ride-status'
import type { RideStatus } from '@/lib/types'

export function RideStatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rideStatusColor(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {rideStatusLabel(status).toUpperCase()}
    </span>
  )
}
