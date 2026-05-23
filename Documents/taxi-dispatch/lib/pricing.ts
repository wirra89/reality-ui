import type { FareSettings, PricingShift } from './types'

export function estimateFare(distanceKm: number, settings: FareSettings): number {
  const calculated = settings.base_fare + distanceKm * settings.price_per_km
  return Math.max(calculated, settings.minimum_fare)
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function getActiveShiftNumber(hour: number = new Date().getHours()): 1 | 2 | 3 {
  if (hour >= 6 && hour < 14) return 1
  if (hour >= 14 && hour < 22) return 2
  return 3
}

export function getActiveFareSettings(shifts: PricingShift[]): FareSettings | null {
  if (!shifts.length) return null
  const num = getActiveShiftNumber()
  return shifts.find(s => s.shift === num) ?? null
}
