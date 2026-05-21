import { getUpdateIntervalMs } from './useGPSTracking'

describe('getUpdateIntervalMs', () => {
  it('returns 20s when driver is online with no ride', () => {
    expect(getUpdateIntervalMs('online')).toBe(20000)
  })

  it('returns 10s when assigned', () => {
    expect(getUpdateIntervalMs('assigned')).toBe(10000)
  })

  it('returns 5s when arriving', () => {
    expect(getUpdateIntervalMs('arriving')).toBe(5000)
  })

  it('returns 3s when on_trip', () => {
    expect(getUpdateIntervalMs('on_trip')).toBe(3000)
  })

  it('returns 20s for unknown status', () => {
    expect(getUpdateIntervalMs('waiting')).toBe(20000)
  })
})
