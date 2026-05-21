import { rideStatusLabel } from '@/lib/ride-status'
import type { RideStatus } from '@/lib/types'

const STEPS: RideStatus[] = ['requested', 'assigned', 'driver_arriving', 'arrived', 'in_progress', 'completed']

interface ActiveRideTimelineProps {
  currentStatus: RideStatus
}

export function ActiveRideTimeline({ currentStatus }: ActiveRideTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-center">
        <p className="text-red-400 font-semibold text-sm">Ride Cancelled</p>
      </div>
    )
  }

  const currentIndex = STEPS.indexOf(currentStatus)

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 mt-1 ${
                active ? 'bg-taxi-yellow border-taxi-yellow' :
                done ? 'bg-green-400 border-green-400' :
                'bg-transparent border-taxi-border'
              }`} />
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 h-6 ${done ? 'bg-green-400' : 'bg-taxi-border'}`} />
              )}
            </div>
            <p className={`text-sm pb-2 ${
              active ? 'text-white font-semibold' :
              done ? 'text-green-400' :
              'text-taxi-muted'
            }`}>
              {rideStatusLabel(step)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
