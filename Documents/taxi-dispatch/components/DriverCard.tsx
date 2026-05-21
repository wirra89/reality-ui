import type { Driver } from '@/lib/types'
import { DriverStatusBadge } from './DriverStatusBadge'

interface DriverCardProps {
  driver: Driver
  onClick?: () => void
  selected?: boolean
}

export function DriverCard({ driver, onClick, selected }: DriverCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all whitespace-nowrap ${
        selected
          ? 'border-taxi-yellow bg-taxi-yellow/5'
          : 'border-taxi-border bg-taxi-card hover:border-taxi-yellow/40'
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-taxi-border flex items-center justify-center text-xs font-bold text-white">
        {driver.profile?.full_name?.[0] ?? 'D'}
      </div>
      <div>
        <p className="text-sm text-white font-medium">{driver.profile?.full_name ?? 'Driver'}</p>
        <p className="text-xs text-taxi-muted">{driver.car_model ?? 'Unknown vehicle'}</p>
      </div>
      <DriverStatusBadge status={driver.status} />
    </div>
  )
}
