import { describe, it, expect } from 'vitest'
import { analyzeReality, reframeForLens, predictDominantLens } from '@/lib/realityEngine'

const base = { mood: 50, stress: 50, confidence: 50 }

describe('analyzeReality', () => {
  it('returns a valid RealityEntry shape', () => {
    const entry = analyzeReality({ ...base, situation: 'She did not reply for 6 hours.' })
    expect(entry.id).toBeDefined()
    expect(entry.createdAt).toBeDefined()
    expect(entry.primaryLens).toBeDefined()
    expect(Array.isArray(entry.alternateLenses)).toBe(true)
    expect(typeof entry.clarityScore).toBe('number')
    expect(typeof entry.betterFrame).toBe('string')
    expect(typeof entry.bestAction).toBe('string')
  })

  it('detects mating lens for silence scenario', () => {
    const entry = analyzeReality({ ...base, situation: "She didn't reply to my message." })
    expect(entry.primaryLens).toBe('mating')
  })

  it('detects mind-reading lens for ghosting scenario', () => {
    const entry = analyzeReality({ ...base, situation: 'He ghosted me completely.' })
    expect(entry.primaryLens).toBe('mind-reading')
  })

  it('detects winners-losers lens for failure scenario', () => {
    const entry = analyzeReality({ ...base, situation: 'I completely failed the presentation.' })
    expect(entry.primaryLens).toBe('winners-losers')
  })

  it('falls back to logic lens for unrecognised input', () => {
    const entry = analyzeReality({ ...base, situation: 'xyzzy quux blorple flibbertigibbet' })
    expect(entry.primaryLens).toBe('logic')
  })

  it('always includes statistics as alternate when primary is not statistics', () => {
    const entry = analyzeReality({ ...base, situation: "She didn't reply." })
    expect(entry.primaryLens).not.toBe('statistics')
    expect(entry.alternateLenses).toContain('statistics')
  })

  it('uses logic instead of statistics as alternate when primary is statistics', () => {
    const entry = analyzeReality({ ...base, situation: 'I am not sure what will happen with the relationship.' })
    if (entry.primaryLens === 'statistics') {
      expect(entry.alternateLenses).toContain('logic')
      expect(entry.alternateLenses).not.toContain('statistics')
    }
  })

  it('clarity score is between 0 and 100', () => {
    const cases = [
      { situation: 'She ignored me.', mood: 10, stress: 100, confidence: 0 },
      { situation: 'Everything is going great.', mood: 100, stress: 0, confidence: 100 },
      { situation: 'I failed.', mood: 50, stress: 50, confidence: 50 },
    ]
    for (const c of cases) {
      const entry = analyzeReality(c)
      expect(entry.clarityScore).toBeGreaterThanOrEqual(0)
      expect(entry.clarityScore).toBeLessThanOrEqual(100)
    }
  })

  it('has 3 or 4 alternate lenses', () => {
    const entry = analyzeReality({ ...base, situation: 'She did not reply.' })
    expect(entry.alternateLenses.length).toBeGreaterThanOrEqual(3)
    expect(entry.alternateLenses.length).toBeLessThanOrEqual(4)
  })

  it('primary lens is not in alternate lenses', () => {
    const entry = analyzeReality({ ...base, situation: 'She did not reply.' })
    expect(entry.alternateLenses).not.toContain(entry.primaryLens)
  })
})

describe('reframeForLens', () => {
  it('returns a frame and action for every lens id', () => {
    const lensIds = [
      'logic','religion','mating','statistics','science','persuasion',
      'economics','simulation','winners-losers','predator-prey','strategy',
      'abundance','moist-robot','victim-oppressor','mind-reading',
    ] as const
    const entry = analyzeReality({ ...base, situation: 'She did not reply.' })
    for (const id of lensIds) {
      const result = reframeForLens(entry, id)
      expect(typeof result.frame).toBe('string')
      expect(result.frame.length).toBeGreaterThan(0)
      expect(typeof result.action).toBe('string')
      expect(result.action.length).toBeGreaterThan(0)
    }
  })
})

describe('predictDominantLens', () => {
  it('returns a valid LensId', () => {
    const lens = predictDominantLens('I am anxious about the future.')
    expect(typeof lens).toBe('string')
    expect(lens.length).toBeGreaterThan(0)
  })

  it('falls back to logic for empty input', () => {
    expect(predictDominantLens('')).toBe('logic')
  })
})
