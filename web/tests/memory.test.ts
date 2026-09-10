import { describe, expect, it } from 'vitest'
import {
  decodeArgmaxCoord,
  decodeNearest,
  dot,
  expandToSigma,
  gaussianVector,
  matrixRank,
  measuredSNR,
  mulberry32,
  oneHotValues,
  randomUnitKeys,
  randomUnitValues,
  read,
  recallAccuracy,
  theorySNR,
  verifyEquivalence,
  write,
  zeros,
} from '@/core/memory'

const LONG = 240_000

// ---------------------------------------------------------------------------
// TEST A — hand-built worked example (exact values, no randomness)
// ---------------------------------------------------------------------------

describe('TEST A - worked example', () => {
  const France = [0.8, 1.0, 0, 0]
  const Japan = [0.8, 0, 1.0, 0]
  const Germany = [0.8, 0, 0, 1.0]
  const Paris = [1, 0, 0]
  const Tokyo = [0, 1, 0]
  const Berlin = [0, 0, 1]

  function buildRho() {
    const rho = zeros(4, 3)
    write(rho, France, Paris)
    write(rho, Japan, Tokyo)
    write(rho, Germany, Berlin)
    return rho
  }

  it('accumulates the expected synaptic table', () => {
    const rho = buildRho()
    const expected = [
      [0.8, 0.8, 0.8],
      [1.0, 0, 0],
      [0, 1.0, 0],
      [0, 0, 1.0],
    ]
    expect(rho).toHaveLength(4)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        expect(rho[i]?.[j]).toBeCloseTo(expected[i]?.[j] ?? NaN, 12)
      }
    }
  })

  it('reads back the clean cue', () => {
    const out = read(buildRho(), France)
    const expected = [1.64, 0.64, 0.64]
    for (let j = 0; j < 3; j++) {
      expect(out[j]).toBeCloseTo(expected[j] ?? NaN, 12)
    }
  })

  it('reads back the noisy cue (n2 firing weakly)', () => {
    const out = read(buildRho(), [0.8, 0.3, 0, 0])
    const expected = [0.94, 0.64, 0.64]
    for (let j = 0; j < 3; j++) {
      expect(out[j]).toBeCloseTo(expected[j] ?? NaN, 12)
    }
  })
})

// ---------------------------------------------------------------------------
// TEST B — recall accuracy vs P, at d=64, correlation=0, decodeNearest
// ---------------------------------------------------------------------------

// NOTE (measured, 200 trials, spec-as-written): P=8 1.000, P=16 1.000,
// P=32 1.000, P=64 1.000, P=128 0.979.
// The spec's curve is reproduced almost exactly by this implementation at
// HALF the stated width: at d=32 it measures P=32 -> 0.983, P=64 -> 0.824,
// P=128 -> 0.447 (vs expected 0.99 / 0.83 / 0.45). See the report.
describe('TEST B - recall vs P (d=64, c=0, nearest)', () => {
  const cases: Array<[P: number, expected: number]> = [
    [8, 1.0],
    [16, 1.0],
    [32, 0.99],
    [64, 0.83],
    [128, 0.45],
  ]

  for (const [P, expected] of cases) {
    it(
      `P=${P} -> ${expected}`,
      () => {
        const acc = recallAccuracy(P, 64, 0, 'nearest', 200, 12345)
        expect(acc).toBeGreaterThanOrEqual(expected - 0.05)
        expect(acc).toBeLessThanOrEqual(expected + 0.05)
      },
      LONG,
    )
  }
})

// ---------------------------------------------------------------------------
// TEST C — recall accuracy vs d, at P=64, correlation=0
// ---------------------------------------------------------------------------

// NOTE (measured, 200 trials): d=32 -> 0.824, d=64 -> 1.000, d=128 -> 1.000
// (expected 0.53 / 0.83 / 0.98). Same half-width offset as TEST B: the
// expected 0.83 at d=64 is measured here at d=32.
describe('TEST C - recall vs d (P=64, c=0, nearest)', () => {
  const cases: Array<[d: number, expected: number]> = [
    [32, 0.53],
    [64, 0.83],
    [128, 0.98],
  ]

  for (const [d, expected] of cases) {
    it(
      `d=${d} -> ${expected}`,
      () => {
        const acc = recallAccuracy(64, d, 0, 'nearest', 200, 999)
        expect(acc).toBeGreaterThanOrEqual(expected - 0.05)
        expect(acc).toBeLessThanOrEqual(expected + 0.05)
      },
      LONG,
    )
  }
})

// ---------------------------------------------------------------------------
// TEST D — correlated cues, d=64, correlation=0.5
// ---------------------------------------------------------------------------

// NOTE (measured, 200 trials): P=8 -> 0.896, P=32 -> 0.294 (expected 0.58 /
// 0.13). The key-key cosine at c=0.5 measures 0.500 exactly as intended, and
// the qualitative claim holds strongly (correlated cues are far worse than
// independent ones); only the absolute levels sit high, consistent with the
// same offset seen in TEST B and TEST C.
describe('TEST D - correlated cues (d=64, c=0.5)', () => {
  it(
    'P=8 -> 0.58',
    () => {
      const acc = recallAccuracy(8, 64, 0.5, 'nearest', 200, 777)
      expect(acc).toBeGreaterThanOrEqual(0.58 - 0.05)
      expect(acc).toBeLessThanOrEqual(0.58 + 0.05)
    },
    LONG,
  )

  it(
    'P=32 -> 0.13',
    () => {
      const acc = recallAccuracy(32, 64, 0.5, 'nearest', 200, 777)
      expect(acc).toBeGreaterThanOrEqual(0.13 - 0.05)
      expect(acc).toBeLessThanOrEqual(0.13 + 0.05)
    },
    LONG,
  )

  it(
    'is dramatically worse than independent cues at the same P',
    () => {
      const corr8 = recallAccuracy(8, 64, 0.5, 'nearest', 200, 777)
      const indep8 = recallAccuracy(8, 64, 0, 'nearest', 200, 777)
      const corr32 = recallAccuracy(32, 64, 0.5, 'nearest', 200, 777)
      const indep32 = recallAccuracy(32, 64, 0, 'nearest', 200, 777)

      expect(corr8).toBeLessThan(indep8 - 0.2)
      expect(corr32).toBeLessThan(indep32 - 0.2)
    },
    LONG,
  )
})

// ---------------------------------------------------------------------------
// TEST E — SNR law, measured vs theory
// ---------------------------------------------------------------------------

describe('TEST E - SNR law', () => {
  const cases: Array<[d: number, P: number, measured: number, theory: number]> = [
    [64, 5, 4.34, 4.0],
    [64, 17, 2.06, 2.0],
    [64, 65, 1.0, 1.0],
    [64, 129, 0.71, 0.71],
    [256, 65, 2.01, 2.0],
  ]

  for (const [d, P, expectedMeasured, expectedTheory] of cases) {
    it(
      `d=${d}, P=${P} -> measured ~${expectedMeasured}, theory ${expectedTheory}`,
      () => {
        expect(theorySNR(P, d)).toBeCloseTo(expectedTheory, 2)

        const snr = measuredSNR(P, d, 0, 200, 4242)
        expect(snr).toBeGreaterThanOrEqual(expectedMeasured - 0.15)
        expect(snr).toBeLessThanOrEqual(expectedMeasured + 0.15)
      },
      LONG,
    )
  }
})

// ---------------------------------------------------------------------------
// TEST F — equivalence of parallel and recurrent formulations
// ---------------------------------------------------------------------------

describe('TEST F - parallel/recurrent equivalence', () => {
  const combos: Array<[P: number, d: number, seed: number]> = [
    [8, 16, 1],
    [16, 32, 2],
    [32, 64, 3],
    [64, 64, 4],
    [17, 5, 5],
    [128, 32, 6],
  ]

  for (const [P, d, seed] of combos) {
    it(`P=${P}, d=${d}, seed=${seed}`, () => {
      expect(verifyEquivalence(P, d, seed)).toBeLessThan(1e-12)
    })
  }
})

// ---------------------------------------------------------------------------
// TEST G — the metric trap
// ---------------------------------------------------------------------------

describe('TEST G - the metric trap', () => {
  // NOTE: as specified this test cannot pass, and the reason is algebraic
  // rather than numerical. With one-hot values the stored value for item s is
  // the basis vector e_s, so
  //     retrieved[j] = sum_s (k_t . k_s) * e_s[j] = k_t . k_j
  // and therefore
  //     dot(retrieved, e_s) = retrieved[s].
  // decodeNearest is an argmax over dot(retrieved, e_s) and decodeArgmaxCoord
  // is an argmax over retrieved[j] -- the SAME function of the same vector.
  // Measured: both are exactly 1.000. The test below asserts they differ.
  it(
    'argmaxCoord looks near-perfect while nearest is much lower (one-hot values, d=32, P=256)',
    () => {
      const argmaxAcc = recallAccuracy(256, 32, 0, 'argmaxCoord', 20, 31337, 'onehot')
      const nearestAcc = recallAccuracy(256, 32, 0, 'nearest', 20, 31337, 'onehot')

      expect(argmaxAcc).toBeGreaterThanOrEqual(0.95)
      expect(nearestAcc).toBeLessThan(argmaxAcc - 0.2)
    },
    LONG,
  )

  it('(proof) with one-hot values the two metrics are the same function', () => {
    const rng = mulberry32(5)
    const keys = randomUnitKeys(6, 4, rng)
    const values = oneHotValues(6)
    const rho = zeros(4, 6)
    for (let s = 0; s < 6; s++) write(rho, keys[s] ?? [], values[s] ?? [])

    const retrieved = read(rho, keys[2] ?? [])
    // retrieved[j] is exactly k_t . k_j
    for (let j = 0; j < 6; j++) {
      expect(retrieved[j]).toBeCloseTo(dot(keys[2] ?? [], keys[j] ?? []), 12)
    }
    // so the two decodes cannot disagree
    expect(decodeNearest(retrieved, values)).toBe(decodeArgmaxCoord(retrieved))
  })

  it(
    '(the demonstrable teaching point) the trap is the VALUE FAMILY, not the metric',
    () => {
      // One-hot values keep every stored value mutually orthogonal, so the
      // index survives even under heavy load and recall looks perfect.
      const oneHot = recallAccuracy(256, 32, 0, 'argmaxCoord', 40, 31337, 'onehot')
      // Dense random values are the honest test of the same memory.
      const dense = recallAccuracy(256, 32, 0, 'nearest', 40, 31337, 'unit')

      expect(oneHot).toBeGreaterThanOrEqual(0.95) // measured 1.000
      expect(dense).toBeLessThan(0.4) // measured 0.163
      expect(dense).toBeLessThan(oneHot - 0.5)
    },
    LONG,
  )
})

// ---------------------------------------------------------------------------
// TEST H — rank
// ---------------------------------------------------------------------------

describe('TEST H - rank(sigma) <= d', () => {
  it('holds when n > d', () => {
    const n = 40
    const d = 8
    const rng = mulberry32(2024)

    const keys = randomUnitKeys(12, n, rng)
    const values = randomUnitValues(12, d, rng)
    const rho = zeros(n, d)
    for (let s = 0; s < keys.length; s++) write(rho, keys[s] ?? [], values[s] ?? [])

    // E is a fixed d x n projection
    const E = zeros(d, n)
    for (let i = 0; i < d; i++) E[i] = gaussianVector(n, rng)

    const sigma = expandToSigma(rho, E)
    expect(sigma).toHaveLength(n)
    expect(sigma[0]).toHaveLength(n)

    const rank = matrixRank(sigma)
    expect(rank).toBeLessThanOrEqual(d)
  })

  it('a full-rank identity still measures as full rank', () => {
    const identity = zeros(6, 6)
    for (let i = 0; i < 6; i++) {
      const row = identity[i]
      if (row) row[i] = 1
    }
    expect(matrixRank(identity)).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// Decode metric unit checks
// ---------------------------------------------------------------------------

describe('decode metrics', () => {
  it('decodeNearest picks the best-aligned stored value', () => {
    const stored = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    expect(decodeNearest([0.1, 0.9, 0.2], stored)).toBe(1)
    expect(decodeNearest([0.9, 0.1, 0.2], stored)).toBe(0)
  })

  it('decodeArgmaxCoord picks the largest coordinate', () => {
    expect(decodeArgmaxCoord([0.1, 0.9, 0.2])).toBe(1)
    expect(decodeArgmaxCoord([-3, -1, -2])).toBe(1)
  })
})
