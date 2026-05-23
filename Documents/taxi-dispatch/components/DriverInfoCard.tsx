import type { Driver } from '@/lib/types'

interface DriverInfoCardProps {
  driver: Driver & { profile?: { full_name?: string | null; phone?: string | null } }
}

export function DriverInfoCard({ driver }: DriverInfoCardProps) {
  const name = driver.profile?.full_name ?? 'Driver'
  const initials = name.charAt(0).toUpperCase()
  const phone = driver.profile?.phone

  return (
    <div className="bg-taxi-card border border-taxi-border rounded-xl p-4 mb-4">
      <p className="text-xs uppercase tracking-wider text-taxi-muted mb-3">Your Driver</p>

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-taxi-yellow/20 border border-taxi-yellow/40 flex items-center justify-center text-taxi-yellow font-bold text-lg shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{name}</p>
          <p className="text-taxi-muted text-sm truncate">
            {driver.car_model ?? 'Unknown vehicle'}
            {driver.car_plate ? ` · ${driver.car_plate}` : ''}
          </p>
        </div>

        {/* Call button */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="shrink-0 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Call
          </a>
        )}
      </div>
    </div>
  )
}
