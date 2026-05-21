import type { RideStatus, UserRole } from './types'

type Transition = { from: RideStatus; to: RideStatus; roles: UserRole[] }

const TRANSITIONS: Transition[] = [
  { from: 'requested',       to: 'assigned',        roles: ['dispatcher', 'admin'] },
  { from: 'requested',       to: 'cancelled',       roles: ['customer', 'dispatcher', 'admin'] },
  { from: 'assigned',        to: 'driver_arriving', roles: ['driver'] },
  { from: 'assigned',        to: 'cancelled',       roles: ['dispatcher', 'admin'] },
  { from: 'driver_arriving', to: 'arrived',         roles: ['driver'] },
  { from: 'driver_arriving', to: 'cancelled',       roles: ['dispatcher', 'admin'] },
  { from: 'arrived',         to: 'in_progress',     roles: ['driver'] },
  { from: 'in_progress',     to: 'completed',       roles: ['driver'] },
  { from: 'in_progress',     to: 'cancelled',       roles: ['dispatcher', 'admin'] },
]

export const DRIVER_TRANSITIONS: Partial<Record<RideStatus, { label: string; next: RideStatus }>> = {
  assigned:        { label: 'Start Driving to Pickup', next: 'driver_arriving' },
  driver_arriving: { label: 'Mark Arrived at Pickup',  next: 'arrived' },
  arrived:         { label: 'Start Ride',              next: 'in_progress' },
  in_progress:     { label: 'Complete Ride',           next: 'completed' },
}

export function canTransition(from: RideStatus, to: RideStatus, role: UserRole): boolean {
  return TRANSITIONS.some(t => t.from === from && t.to === to && t.roles.includes(role))
}

export function rideStatusLabel(status: RideStatus): string {
  const labels: Record<RideStatus, string> = {
    requested:       'Waiting for driver',
    assigned:        'Driver assigned',
    driver_arriving: 'Driver arriving',
    arrived:         'Driver arrived',
    in_progress:     'On the way',
    completed:       'Completed',
    cancelled:       'Cancelled',
  }
  return labels[status]
}

export function rideStatusColor(status: RideStatus): string {
  const colors: Record<RideStatus, string> = {
    requested:       'text-orange-400 bg-orange-400/10 border-orange-400/30',
    assigned:        'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    driver_arriving: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    arrived:         'text-purple-400 bg-purple-400/10 border-purple-400/30',
    in_progress:     'text-green-400 bg-green-400/10 border-green-400/30',
    completed:       'text-gray-400 bg-gray-400/10 border-gray-400/30',
    cancelled:       'text-red-400 bg-red-400/10 border-red-400/30',
  }
  return colors[status]
}

export function driverStatusColor(status: string): string {
  const colors: Record<string, string> = {
    offline:  'text-gray-500',
    online:   'text-green-400',
    assigned: 'text-yellow-400',
    arriving: 'text-blue-400',
    waiting:  'text-purple-400',
    on_trip:  'text-green-300',
  }
  return colors[status] ?? 'text-gray-400'
}
