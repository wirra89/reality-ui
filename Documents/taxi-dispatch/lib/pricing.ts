import type { FareSettings } from './types'

export function estimateFare(distanceKm: number, settings: FareSettings): number {
  const calculated = settings.base_fare + distanceKm * settings.price_per_km
  return Math.max(calculated, settings.minimum_fare)
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}
