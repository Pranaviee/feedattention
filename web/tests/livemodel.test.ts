import { describe, expect, it } from 'vitest'
import { bdhMicro, beat3Query, beat3Steps } from '@/livemodel/micro'

describe('beat 3 micro table', () => {
  it('stores three associations in an 8×3 table', () => {
    const steps = beat3Steps()
    expect(steps).toHaveLength(3)
    const last = steps[2]
    expect(last?.rho).toHaveLength(8)
    expect(last?.rho[0]).toHaveLength(3)
  })

  it('reads Paris as the winner for the France cue', () => {
    const q = beat3Query()
    expect(q.retrieved[0]).toBeCloseTo(1.64, 8)
    expect(q.retrieved[1]).toBeCloseTo(0.64, 8)
    expect(q.retrieved[2]).toBeCloseTo(0.64, 8)
    expect(q.winner).toBe('Paris')
  })
})

describe('BDH micro equivalence', () => {
  it('matches sequential ρ read to parallel (QKᵀ)V', () => {
    const { maxDiff, steps, parallel } = bdhMicro()
    expect(maxDiff).toBeLessThan(1e-10)
    expect(steps[1]?.read[0]).toBeCloseTo(parallel[1]?.[0] ?? NaN, 8)
    expect(steps[2]?.read[1]).toBeCloseTo(parallel[2]?.[1] ?? NaN, 8)
  })
})
