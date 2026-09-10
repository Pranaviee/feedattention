import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAPACITY,
  CHECKPOINT_AT,
  CHECKPOINT_META,
  CHECKPOINT_RECALL,
  deltaMin,
  deltaMinCurves,
  theorySNR,
  theorySNRCurve,
} from '@/data/measured'

describe('measured experiment tables', () => {
  it('matches capacity_table.csv exactly', () => {
    const raw = readFileSync(resolve(__dirname, '../capacity_table.csv'), 'utf8')
    const rows = raw
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(',').map(Number))
    expect(CAPACITY).toHaveLength(rows.length)
    for (const [i, cols] of rows.entries()) {
      const r = CAPACITY[i]!
      expect([r.P, r.d64_SRM, r.d64_Acc, r.d128_SRM, r.d128_Acc]).toEqual(cols)
    }
  })

  it('matches checkpoint_recall_collapse_data.csv data rows', () => {
    const raw = readFileSync(resolve(__dirname, '../checkpoint_recall_collapse_data.csv'), 'utf8')
    const rows = raw
      .split('\n')
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('t,'))
      .map((line) => line.split(',').map(Number))
    expect(CHECKPOINT_RECALL).toHaveLength(rows.length)
    for (const [i, cols] of rows.entries()) {
      const r = CHECKPOINT_RECALL[i]!
      expect([r.t, r.acc_C0, r.l2_C0, r.acc_C2, r.l2_C2, r.acc_C8, r.l2_C8]).toEqual(cols)
    }
  })

  it('keeps the published t=10 and t=300 callouts', () => {
    expect(CHECKPOINT_AT[10].acc_C0).toBe(0.981)
    expect(CHECKPOINT_AT[10].acc_C2).toBe(0.833)
    expect(CHECKPOINT_AT[10].acc_C8).toBe(0.694)
    expect(CHECKPOINT_AT[300].acc_C0).toBe(0.44)
    expect(CHECKPOINT_AT[300].acc_C2).toBe(0.094)
    expect(CHECKPOINT_AT[300].acc_C8).toBe(0.048)
  })

  it('uses the stated SNR formula', () => {
    expect(theorySNR(5, 64)).toBe(4)
    expect(theorySNR(65, 64)).toBe(1)
  })

  it('samples the theory curve from the same formula, not extra measurements', () => {
    const curve = theorySNRCurve(64)
    expect(curve[0]?.P).toBe(5)
    expect(curve[0]?.theory).toBe(4)
    expect(curve.at(-1)?.P).toBe(256)
    for (const pt of curve) {
      expect(pt.theory).toBeCloseTo(theorySNR(pt.P, 64), 10)
    }
  })

  it('uses δ_min(t) = t(C+1) log(n) / n', () => {
    const n = CHECKPOINT_META.n
    expect(deltaMin(300, 0, n)).toBeCloseTo((300 * 1 * Math.log(n)) / n, 12)
    expect(deltaMin(300, 8, n)).toBeCloseTo((300 * 9 * Math.log(n)) / n, 12)
    expect(deltaMin(300, 8, n)).toBeGreaterThan(deltaMin(300, 2, n))
    expect(deltaMin(300, 2, n)).toBeGreaterThan(deltaMin(300, 0, n))
  })

  it('samples the δ bound as theory, not extra checkpoint rows', () => {
    const curve = deltaMinCurves(CHECKPOINT_META.n, 10, 300, 32)
    expect(curve).toHaveLength(32)
    expect(curve[0]?.t).toBe(10)
    expect(curve.at(-1)?.t).toBe(300)
    for (const pt of curve) {
      expect(pt.C0).toBeCloseTo(deltaMin(pt.t, 0, CHECKPOINT_META.n), 10)
      expect(pt.C2).toBeCloseTo(deltaMin(pt.t, 2, CHECKPOINT_META.n), 10)
      expect(pt.C8).toBeCloseTo(deltaMin(pt.t, 8, CHECKPOINT_META.n), 10)
    }
  })
})
