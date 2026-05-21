import { canTransition, rideStatusLabel, rideStatusColor, DRIVER_TRANSITIONS } from './ride-status'

describe('canTransition', () => {
  it('allows valid driver transitions', () => {
    expect(canTransition('assigned', 'driver_arriving', 'driver')).toBe(true)
    expect(canTransition('driver_arriving', 'arrived', 'driver')).toBe(true)
    expect(canTransition('arrived', 'in_progress', 'driver')).toBe(true)
    expect(canTransition('in_progress', 'completed', 'driver')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(canTransition('requested', 'in_progress', 'driver')).toBe(false)
    expect(canTransition('completed', 'in_progress', 'driver')).toBe(false)
  })

  it('allows dispatcher to assign', () => {
    expect(canTransition('requested', 'assigned', 'dispatcher')).toBe(true)
  })

  it('allows customer to cancel when requested', () => {
    expect(canTransition('requested', 'cancelled', 'customer')).toBe(true)
  })

  it('blocks customer cancelling in_progress ride', () => {
    expect(canTransition('in_progress', 'cancelled', 'customer')).toBe(false)
  })
})

describe('rideStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(rideStatusLabel('requested')).toBe('Waiting for driver')
    expect(rideStatusLabel('driver_arriving')).toBe('Driver arriving')
    expect(rideStatusLabel('in_progress')).toBe('On the way')
    expect(rideStatusLabel('completed')).toBe('Completed')
  })
})
