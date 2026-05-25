import { estimateFare, calculateWaitCharge } from './pricing'

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

describe('calculateWaitCharge', () => {
  const base = new Date('2024-01-01T10:00:00Z').getTime()
  const ts = (offsetSecs: number) => new Date(base + offsetSecs * 1000).toISOString()

  it('returns 0 when arrivedAt is null', () => {
    expect(calculateWaitCharge(null, ts(300), 0.10)).toBe(0)
  })

  it('returns 0 when startedAt is null', () => {
    expect(calculateWaitCharge(ts(0), null, 0.10)).toBe(0)
  })

  it('returns 0 within 2-minute free window (exactly 120 s)', () => {
    expect(calculateWaitCharge(ts(0), ts(120), 0.10)).toBe(0)
  })

  it('charges per full minute beyond 2 min free window', () => {
    expect(calculateWaitCharge(ts(0), ts(300), 0.10)).toBeCloseTo(0.50)
  })

  it('uses floor for partial minutes', () => {
    expect(calculateWaitCharge(ts(0), ts(239), 0.10)).toBeCloseTo(0.30)
  })

  it('returns 0 when wait is exactly 0 seconds', () => {
    expect(calculateWaitCharge(ts(0), ts(0), 0.10)).toBe(0)
  })
})
