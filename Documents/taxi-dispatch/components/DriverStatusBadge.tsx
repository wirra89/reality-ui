import { driverStatusColor } from '@/lib/ride-status'
import type { DriverStatus } from '@/lib/types'

const LABELS: Record<DriverStatus, string> = {
  offline:  'Offline',
  online:   'Online',
  assigned: 'Assigned',
  arriving: 'Arriving',
  waiting:  'Waiting',
  on_trip:  'On Trip',
}

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${driverStatusColor(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  )
}
