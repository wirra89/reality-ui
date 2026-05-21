import { estimateFare } from './pricing'

describe('estimateFare', () => {
  const settings = { base_fare: 2, price_per_km: 1.5, minimum_fare: 5 }

  it('applies base fare + distance', () => {
    expect(estimateFare(4, settings)).toBe(8) // 2 + 4*1.5
  })

  it('returns minimum fare when calculated is lower', () => {
    expect(estimateFare(1, settings)).toBe(5) // 2 + 1.5 = 3.5 < 5
  })

  it('applies minimum fare when distance is zero', () => {
    expect(estimateFare(0, settings)).toBe(5)
  })

  it('handles fractional km', () => {
    expect(estimateFare(2.5, settings)).toBe(5.75) // 2 + 2.5*1.5 = 5.75
  })
})
