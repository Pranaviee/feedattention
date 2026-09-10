/**
 * Offline sweep for the Synaptic Memory Explainer.
 *
 * Runs the associative-memory measurements from src/core/memory.ts over a
 * (d, P, correlation) grid and writes src/data/precomputed.json, which the UI
 * ships as its PRECOMPUTED reference curves.
 *
 * Run with:  npm run precompute            (500 trials/point, ~10 min)
 *            npm run precompute -- --trials=25   (smoke run)
 *
 * All randomness is seeded. Each grid point derives its own seed from the
 * point's coordinates, so a value is reproducible on its own and does not
 * depend on the order the grid is walked.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { measuredSNR, recallAccuracy, theorySNR } from '@/core/memory'

// ---------------------------------------------------------------------------
// Sweep definition
// ---------------------------------------------------------------------------

const BASE_SEED = 20260906
const MIN_TRIALS = 500

const DS = [32, 64, 128, 256] as const
const PS = [4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256] as const
const CORRELATIONS = [0, 0.25, 0.5] as const

/** metricComparison uses the same ladder from P=8 up. */
const METRIC_PS = PS.filter((p) => p >= 8)

/** Context lengths for the footprint comparison. */
const TS = [10, 100, 1000, 10000, 100000] as const
const KV_MODEL_DIM = 256
const BDH_NEURONS = 8192
const BDH_WIDTH = 256

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

interface RecallRecord {
  d: number
  P: number
  correlation: number
  accuracy: number
  trials: number
}

interface SnrRecord {
  d: number
  P: number
  correlation: number
  measured: number
  theory: number
  trials: number
}

interface MetricRecord {
  d: number
  P: number
  valueKind: 'onehot' | 'unit'
  metric: 'nearest' | 'argmaxCoord'
  accuracy: number
  trials: number
}

interface FootprintRecord {
  T: number
  transformerKV: number
  bdhTable: number
}

interface Precomputed {
  meta: {
    generatedBy: string
    baseSeed: number
    trials: number
    ds: number[]
    ps: number[]
    correlations: number[]
  }
  recallVsP: RecallRecord[]
  recallVsPCorrelated: RecallRecord[]
  snrCurve: SnrRecord[]
  metricComparison: MetricRecord[]
  memoryFootprint: FootprintRecord[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Per-point seed. Mixing the coordinates in means a point's value does not
 * depend on where it sits in the iteration order, so the grid can be
 * reordered or resumed without changing any result.
 */
function seedFor(d: number, P: number, correlation: number, salt: number): number {
  const c = Math.round(correlation * 1000)
  return (
    (BASE_SEED ^
      Math.imul(d, 73856093) ^
      Math.imul(P, 19349663) ^
      Math.imul(c, 83492791) ^
      Math.imul(salt, 2654435761)) >>>
    0
  )
}

function parseTrials(argv: string[]): number {
  const arg = argv.find((a) => a.startsWith('--trials='))
  if (arg === undefined) return MIN_TRIALS
  const parsed = Number.parseInt(arg.slice('--trials='.length), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return MIN_TRIALS
  return parsed
}

function fmt(x: number, places = 3): string {
  return x.toFixed(places)
}

function elapsed(t0: number): string {
  const s = (performance.now() - t0) / 1000
  return s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}m${(s % 60).toFixed(0).padStart(2, '0')}s`
}

// ---------------------------------------------------------------------------
// Sweeps
// ---------------------------------------------------------------------------

const TRIALS = parseTrials(process.argv.slice(2))
const started = performance.now()

if (TRIALS < MIN_TRIALS) {
  console.log(
    `! running with ${TRIALS} trials/point (below the ${MIN_TRIALS} baseline) - smoke run only\n`,
  )
}

console.log(`Sweeping d=[${DS.join(', ')}]  P=[${PS.join(', ')}]`)
console.log(`correlations=[${CORRELATIONS.join(', ')}]  trials=${TRIALS}  baseSeed=${BASE_SEED}\n`)

// --- 1 + 2: recall, all correlations (correlation 0 slice is reused as #1) ---

const recallVsPCorrelated: RecallRecord[] = []

for (const correlation of CORRELATIONS) {
  for (const d of DS) {
    const t0 = performance.now()
    for (const P of PS) {
      const accuracy = recallAccuracy(
        P,
        d,
        correlation,
        'nearest',
        TRIALS,
        seedFor(d, P, correlation, 1),
      )
      recallVsPCorrelated.push({ d, P, correlation, accuracy, trials: TRIALS })
    }
    console.log(`  recall  c=${correlation}  d=${String(d).padStart(3)}  done in ${elapsed(t0)}`)
  }
}

// #1 is exactly the independent-cue slice of #2 - derived, not recomputed.
const recallVsP: RecallRecord[] = recallVsPCorrelated.filter((r) => r.correlation === 0)

// --- 3: SNR curve ---

const snrCurve: SnrRecord[] = []
for (const d of DS) {
  const t0 = performance.now()
  for (const P of PS) {
    const measured = measuredSNR(P, d, 0, TRIALS, seedFor(d, P, 0, 2))
    snrCurve.push({ d, P, correlation: 0, measured, theory: theorySNR(P, d), trials: TRIALS })
  }
  console.log(`  snr     c=0    d=${String(d).padStart(3)}  done in ${elapsed(t0)}`)
}

// --- 4: metric comparison (one-hot values, d=32) ---

const metricComparison: MetricRecord[] = []
{
  const d = 32
  const t0 = performance.now()
  for (const P of METRIC_PS) {
    for (const metric of ['nearest', 'argmaxCoord'] as const) {
      const accuracy = recallAccuracy(
        P,
        d,
        0,
        metric,
        TRIALS,
        seedFor(d, P, 0, metric === 'nearest' ? 3 : 4),
        'onehot',
      )
      metricComparison.push({ d, P, valueKind: 'onehot', metric, accuracy, trials: TRIALS })
    }

    // Honest baseline. With one-hot values the two decodes above are provably
    // the same function -- retrieved[j] == k_t.k_j, so dot(retrieved, e_s) is
    // just retrieved[s] -- and both read ~1.00 at every P. The interference is
    // only visible once the values are dense, so record that series too or
    // there is nothing for the misleading curve to be misleading *against*.
    metricComparison.push({
      d,
      P,
      valueKind: 'unit',
      metric: 'nearest',
      accuracy: recallAccuracy(P, d, 0, 'nearest', TRIALS, seedFor(d, P, 0, 5), 'unit'),
      trials: TRIALS,
    })
  }
  console.log(`  metric  one-hot + dense d=32   done in ${elapsed(t0)}`)
}

// --- 5: memory footprint (computed, not simulated) ---

const memoryFootprint: FootprintRecord[] = TS.map((T) => ({
  T,
  transformerKV: T * 2 * KV_MODEL_DIM,
  bdhTable: BDH_NEURONS * BDH_WIDTH,
}))

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.resolve(here, '..', 'src', 'data', 'precomputed.json')

const payload: Precomputed = {
  meta: {
    generatedBy: 'scripts/precompute.ts',
    baseSeed: BASE_SEED,
    trials: TRIALS,
    ds: [...DS],
    ps: [...PS],
    correlations: [...CORRELATIONS],
  },
  recallVsP,
  recallVsPCorrelated,
  snrCurve,
  metricComparison,
  memoryFootprint,
}

mkdirSync(path.dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(`\nwrote ${path.relative(path.resolve(here, '..'), outPath)}`)
console.log(
  `  recallVsP=${recallVsP.length}  recallVsPCorrelated=${recallVsPCorrelated.length}` +
    `  snrCurve=${snrCurve.length}  metricComparison=${metricComparison.length}` +
    `  memoryFootprint=${memoryFootprint.length}`,
)
console.log(`  total ${elapsed(started)}`)

// ---------------------------------------------------------------------------
// Summary tables
// ---------------------------------------------------------------------------

function recallAt(d: number, P: number, correlation: number): number | undefined {
  return recallVsPCorrelated.find((r) => r.d === d && r.P === P && r.correlation === correlation)
    ?.accuracy
}

console.log('\n--- recall vs P (correlation 0) ---')
console.log(`  P     ${DS.map((d) => `d=${String(d).padEnd(6)}`).join('')}`)
for (const P of PS) {
  const cells = DS.map((d) => fmt(recallAt(d, P, 0) ?? NaN).padEnd(8)).join('')
  console.log(`  ${String(P).padEnd(6)}${cells}`)
}

console.log('\n--- recall vs cue overlap (d=64) ---')
console.log(`  P     ${CORRELATIONS.map((c) => `c=${String(c).padEnd(7)}`).join('')}`)
for (const P of PS) {
  const cells = CORRELATIONS.map((c) => fmt(recallAt(64, P, c) ?? NaN).padEnd(9)).join('')
  console.log(`  ${String(P).padEnd(6)}${cells}`)
}

console.log('\n--- SNR measured vs theory (d=64) ---')
console.log('  P     measured  theory')
for (const P of PS) {
  const row = snrCurve.find((r) => r.d === 64 && r.P === P)
  if (row) console.log(`  ${String(P).padEnd(6)}${fmt(row.measured).padEnd(10)}${fmt(row.theory)}`)
}

console.log('\n--- metric comparison (d=32) ---')
console.log('  P     onehot/nearest  onehot/argmax   dense/nearest')
for (const P of METRIC_PS) {
  const pick = (kind: 'onehot' | 'unit', metric: 'nearest' | 'argmaxCoord') =>
    metricComparison.find((r) => r.P === P && r.valueKind === kind && r.metric === metric)?.accuracy
  console.log(
    `  ${String(P).padEnd(6)}${fmt(pick('onehot', 'nearest') ?? NaN).padEnd(16)}` +
      `${fmt(pick('onehot', 'argmaxCoord') ?? NaN).padEnd(16)}` +
      `${fmt(pick('unit', 'nearest') ?? NaN)}`,
  )
}

console.log('\n--- memory footprint ---')
console.log('  T         transformerKV   bdhTable')
for (const r of memoryFootprint) {
  console.log(
    `  ${String(r.T).padEnd(10)}${String(r.transformerKV).padEnd(16)}${String(r.bdhTable)}`,
  )
}

// ---------------------------------------------------------------------------
// Sanity check against the expectations in tests B-E
// ---------------------------------------------------------------------------

interface Check {
  label: string
  expected: number
  actual: number
  tol: number
}

const checks: Check[] = []

// TEST B - recall vs P at d=64, correlation 0
for (const [P, expected] of [
  [8, 1.0],
  [16, 1.0],
  [32, 0.99],
  [64, 0.83],
  [128, 0.45],
] as const) {
  checks.push({
    label: `B  d=64  P=${String(P).padEnd(3)} recall`,
    expected,
    actual: recallAt(64, P, 0) ?? NaN,
    tol: 0.05,
  })
}

// TEST C - recall vs d at P=64, correlation 0
for (const [d, expected] of [
  [32, 0.53],
  [64, 0.83],
  [128, 0.98],
] as const) {
  checks.push({
    label: `C  P=64  d=${String(d).padEnd(3)} recall`,
    expected,
    actual: recallAt(d, 64, 0) ?? NaN,
    tol: 0.05,
  })
}

// TEST D - correlated cues at d=64, correlation 0.5
for (const [P, expected] of [
  [8, 0.58],
  [32, 0.13],
] as const) {
  checks.push({
    label: `D  d=64  P=${String(P).padEnd(3)} c=0.5 `,
    expected,
    actual: recallAt(64, P, 0.5) ?? NaN,
    tol: 0.05,
  })
}

// TEST E - SNR. These P values are deliberately off-grid (P-1 a power of two),
// so they are measured here rather than read out of the sweep. 200 trials
// matches what the test suite uses.
const SNR_CHECK_TRIALS = 200
for (const [d, P, expected] of [
  [64, 5, 4.34],
  [64, 17, 2.06],
  [64, 65, 1.0],
  [64, 129, 0.71],
  [256, 65, 2.01],
] as const) {
  checks.push({
    label: `E  d=${String(d).padEnd(3)} P=${String(P).padEnd(3)} snr   `,
    expected,
    actual: measuredSNR(P, d, 0, SNR_CHECK_TRIALS, 4242),
    tol: 0.15,
  })
}

console.log('\n--- sanity check vs tests B-E ---')
let matched = 0
for (const c of checks) {
  const delta = c.actual - c.expected
  const ok = Math.abs(delta) <= c.tol
  if (ok) matched++
  console.log(
    `  ${ok ? 'ok      ' : 'MISMATCH'} ${c.label}  expected ${fmt(c.expected, 2).padEnd(6)}` +
      `got ${fmt(c.actual, 3).padEnd(7)}(${delta >= 0 ? '+' : ''}${fmt(delta, 3)})`,
  )
}
console.log(`\n  ${matched}/${checks.length} within tolerance`)

if (matched < checks.length) {
  console.log(
    '  Note: the recall mismatches are the known discrepancy documented in\n' +
      '  tests/memory.test.ts - this implementation reproduces the expected\n' +
      "  curve at half the stated width. The JSON above is this build's\n" +
      '  measured truth, not the test expectations.',
  )
}
