/**
 * Associative memory (fast weights / linear attention state).
 *
 * The state is a matrix `rho` of shape [n][d]:
 *   n = number of neurons (key dimension)
 *   d = value dimension
 *
 * Storing an association is an outer-product accumulation; reading is a
 * left-multiply by the key. Nothing here imports React or any dependency,
 * and no function calls Math.random — all randomness flows from a seeded PRNG.
 */

export type Rng = () => number
export type Vector = number[]
export type Matrix = number[][]

/** Which decode rule to score a retrieved vector with. */
export type DecodeMetric = 'nearest' | 'argmaxCoord'

/** Which family of value vectors to store. */
export type ValueKind = 'unit' | 'onehot'

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Returns a function producing uniforms in [0, 1).
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One standard normal sample via Box-Muller. */
export function gaussian(rng: Rng): number {
  let u = rng()
  while (u === 0) u = rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** A vector of `d` independent standard normals. */
export function gaussianVector(d: number, rng: Rng): Vector {
  const out = new Array<number>(d)
  for (let i = 0; i < d; i++) out[i] = gaussian(rng)
  return out
}

// ---------------------------------------------------------------------------
// Small vector / matrix helpers
// ---------------------------------------------------------------------------

export function zeros(n: number, d: number): Matrix {
  const m = new Array<Vector>(n)
  for (let i = 0; i < n; i++) m[i] = new Array<number>(d).fill(0)
  return m
}

export function dot(a: Vector, b: Vector): number {
  const len = Math.min(a.length, b.length)
  let sum = 0
  for (let i = 0; i < len; i++) sum += (a[i] ?? 0) * (b[i] ?? 0)
  return sum
}

export function norm(a: Vector): number {
  return Math.sqrt(dot(a, a))
}

/** Scale to unit length. A zero vector is returned unchanged. */
export function normalize(a: Vector): Vector {
  const n = norm(a)
  if (n === 0) return a.slice()
  return a.map((x) => x / n)
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Store an association in place: rho[i][j] += k[i] * v[j].
 *
 * This is the whole write path — no entry is appended anywhere, existing
 * strengths are just nudged.
 */
export function write(rho: Matrix, k: Vector, v: Vector): void {
  const n = rho.length
  for (let i = 0; i < n; i++) {
    const row = rho[i]
    if (row === undefined) continue
    const ki = k[i] ?? 0
    if (ki === 0) continue
    const d = row.length
    for (let j = 0; j < d; j++) {
      row[j] = (row[j] ?? 0) + ki * (v[j] ?? 0)
    }
  }
}

/**
 * Read the memory with a cue: out[j] = sum_i k[i] * rho[i][j]  (i.e. kᵀ·rho).
 */
export function read(rho: Matrix, k: Vector): Vector {
  const n = rho.length
  const d = rho[0]?.length ?? 0
  const out = new Array<number>(d).fill(0)
  for (let i = 0; i < n; i++) {
    const row = rho[i]
    if (row === undefined) continue
    const ki = k[i] ?? 0
    if (ki === 0) continue
    for (let j = 0; j < d; j++) {
      out[j] = (out[j] ?? 0) + ki * (row[j] ?? 0)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Key / value generators
// ---------------------------------------------------------------------------

/** P independent gaussian vectors in R^d, each normalised to unit length. */
export function randomUnitKeys(P: number, d: number, rng: Rng): Matrix {
  const keys = new Array<Vector>(P)
  for (let s = 0; s < P; s++) keys[s] = normalize(gaussianVector(d, rng))
  return keys
}

/**
 * P keys sharing a common component, so that cues overlap.
 *
 *   k_s = sqrt(1 - c) * gaussian(d) + sqrt(c) * base
 *
 * with `base` a single raw gaussian vector reused by every key, then each
 * k_s normalised. Because ||base||^2 ~ d, the expected cosine between two
 * distinct keys is approximately `c`: c=0 gives independent keys, c=0.5
 * gives heavy overlap.
 */
export function correlatedKeys(P: number, d: number, correlation: number, rng: Rng): Matrix {
  const c = Math.min(1, Math.max(0, correlation))
  const wShared = Math.sqrt(c)
  const wPrivate = Math.sqrt(1 - c)
  const base = gaussianVector(d, rng)
  const keys = new Array<Vector>(P)
  for (let s = 0; s < P; s++) {
    const g = gaussianVector(d, rng)
    const k = new Array<number>(d)
    for (let i = 0; i < d; i++) k[i] = wPrivate * (g[i] ?? 0) + wShared * (base[i] ?? 0)
    keys[s] = normalize(k)
  }
  return keys
}

/** P independent gaussian vectors in R^d, each normalised to unit length. */
export function randomUnitValues(P: number, d: number, rng: Rng): Matrix {
  const values = new Array<Vector>(P)
  for (let s = 0; s < P; s++) values[s] = normalize(gaussianVector(d, rng))
  return values
}

/** The P x P identity: value s is the one-hot basis vector e_s. */
export function oneHotValues(P: number): Matrix {
  const values = new Array<Vector>(P)
  for (let s = 0; s < P; s++) {
    const v = new Array<number>(P).fill(0)
    v[s] = 1
    values[s] = v
  }
  return values
}

/** Dispatch helper: independent keys at c=0, correlated keys otherwise. */
function makeKeys(P: number, d: number, correlation: number, rng: Rng): Matrix {
  return correlation === 0 ? randomUnitKeys(P, d, rng) : correlatedKeys(P, d, correlation, rng)
}

/** Dispatch helper for the value family. */
function makeValues(P: number, d: number, kind: ValueKind, rng: Rng): Matrix {
  return kind === 'onehot' ? oneHotValues(P) : randomUnitValues(P, d, rng)
}

// ---------------------------------------------------------------------------
// Decode metrics
// ---------------------------------------------------------------------------

/**
 * HONEST metric: which stored value does the retrieved vector actually point
 * at? argmax over s of dot(retrieved, storedValues[s]).
 */
export function decodeNearest(retrieved: Vector, storedValues: Matrix): number {
  let best = -Infinity
  let bestIndex = -1
  for (let s = 0; s < storedValues.length; s++) {
    const v = storedValues[s]
    if (v === undefined) continue
    const score = dot(retrieved, v)
    if (score > best) {
      best = score
      bestIndex = s
    }
  }
  return bestIndex
}

/**
 * MISLEADING metric: argmax over coordinates of the retrieved vector.
 * With one-hot values this reads off the self-similarity term and reports
 * near-perfect recall even when interference is severe.
 */
export function decodeArgmaxCoord(retrieved: Vector): number {
  let best = -Infinity
  let bestIndex = -1
  for (let j = 0; j < retrieved.length; j++) {
    const x = retrieved[j] ?? 0
    if (x > best) {
      best = x
      bestIndex = j
    }
  }
  return bestIndex
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/**
 * Fraction of stored items recalled correctly.
 *
 * Each trial generates a fresh set of P key/value pairs, writes them all into
 * one fixed-size memory, then queries with every stored key and checks whether
 * the decode returns the right index. Returns the mean over all queries and
 * all trials.
 */
export function recallAccuracy(
  P: number,
  d: number,
  correlation: number,
  metric: DecodeMetric,
  trials: number,
  seed: number,
  valueKind: ValueKind = 'unit',
): number {
  const rng = mulberry32(seed)
  let correct = 0
  let total = 0

  for (let trial = 0; trial < trials; trial++) {
    const keys = makeKeys(P, d, correlation, rng)
    const values = makeValues(P, d, valueKind, rng)
    const valueDim = values[0]?.length ?? d

    const rho = zeros(d, valueDim)
    for (let s = 0; s < P; s++) write(rho, keys[s] ?? [], values[s] ?? [])

    for (let t = 0; t < P; t++) {
      const retrieved = read(rho, keys[t] ?? [])
      const guess =
        metric === 'nearest' ? decodeNearest(retrieved, values) : decodeArgmaxCoord(retrieved)
      if (guess === t) correct++
      total++
    }
  }

  return total === 0 ? 0 : correct / total
}

/**
 * Measured signal-to-noise ratio of a read.
 *
 *   signal = ||k_t||^2 * v_t
 *   noise  = read(rho, k_t) - signal
 *   snr    = ||signal|| / ||noise||
 *
 * Each trial pools ||signal|| and ||noise|| over all P queries and forms one
 * ratio; the return value is the mean of those per-trial ratios.
 *
 * The pooling matters. Averaging the per-query ratio instead would measure
 * E[1/||noise||], which by Jensen's inequality sits above 1/E[||noise||] --
 * a bias that is negligible for large P but inflates the small-P end of the
 * curve noticeably (at d=64, P=5 it reads 4.91 rather than ~4.4).
 */
export function measuredSNR(
  P: number,
  d: number,
  correlation: number,
  trials: number,
  seed: number,
): number {
  const rng = mulberry32(seed)
  let sum = 0
  let count = 0

  for (let trial = 0; trial < trials; trial++) {
    const keys = makeKeys(P, d, correlation, rng)
    const values = randomUnitValues(P, d, rng)

    const rho = zeros(d, d)
    for (let s = 0; s < P; s++) write(rho, keys[s] ?? [], values[s] ?? [])

    let signalTotal = 0
    let noiseTotal = 0

    for (let t = 0; t < P; t++) {
      const kt = keys[t]
      const vt = values[t]
      if (kt === undefined || vt === undefined) continue

      const kk = dot(kt, kt)
      const retrieved = read(rho, kt)
      const signal = new Array<number>(d)
      const noise = new Array<number>(d)
      for (let j = 0; j < d; j++) {
        const sj = kk * (vt[j] ?? 0)
        signal[j] = sj
        noise[j] = (retrieved[j] ?? 0) - sj
      }

      signalTotal += norm(signal)
      noiseTotal += norm(noise)
    }

    if (noiseTotal > 0) {
      sum += signalTotal / noiseTotal
      count++
    }
  }

  return count === 0 ? 0 : sum / count
}

/** The predicted SNR law: sqrt(d / (P - 1)). */
export function theorySNR(P: number, d: number): number {
  return Math.sqrt(d / (P - 1))
}

// ---------------------------------------------------------------------------
// Equivalence check (parallel attention == recurrent state update)
// ---------------------------------------------------------------------------

/**
 * Compute the same outputs two ways and return the largest absolute
 * disagreement.
 *
 *  (a) PARALLEL:  scores = tril(K·Kᵀ, -1); out = scores·V
 *      Entry [t][s] of `scores` survives only when s < t, mirroring how the
 *      reference BDH implementation computes causal attention.
 *
 *  (b) RECURRENT: rho = zeros; for each t, read BEFORE writing.
 *
 * These are the same arithmetic in a different order, so they must agree to
 * floating point precision.
 */
export function verifyEquivalence(P: number, d: number, seed: number): number {
  const rng = mulberry32(seed)
  const K = randomUnitKeys(P, d, rng)
  const V = randomUnitValues(P, d, rng)

  // (a) parallel: strictly-lower-triangular score matrix, then scores · V
  const parallel = zeros(P, d)
  for (let t = 0; t < P; t++) {
    const kt = K[t]
    const outRow = parallel[t]
    if (kt === undefined || outRow === undefined) continue
    for (let s = 0; s < t; s++) {
      const ks = K[s]
      const vs = V[s]
      if (ks === undefined || vs === undefined) continue
      const score = dot(kt, ks)
      for (let j = 0; j < d; j++) outRow[j] = (outRow[j] ?? 0) + score * (vs[j] ?? 0)
    }
  }

  // (b) recurrent: read the state, then fold the new pair into it
  const rho = zeros(d, d)
  const recurrent = new Array<Vector>(P)
  for (let t = 0; t < P; t++) {
    const kt = K[t] ?? []
    recurrent[t] = read(rho, kt)
    write(rho, kt, V[t] ?? [])
  }

  let maxDiff = 0
  for (let t = 0; t < P; t++) {
    const a = parallel[t]
    const b = recurrent[t]
    if (a === undefined || b === undefined) continue
    for (let j = 0; j < d; j++) {
      const diff = Math.abs((a[j] ?? 0) - (b[j] ?? 0))
      if (diff > maxDiff) maxDiff = diff
    }
  }
  return maxDiff
}

// ---------------------------------------------------------------------------
// Sigma / rho
// ---------------------------------------------------------------------------

/**
 * Expand the [n][d] state through a fixed d x n projection E, giving the
 * [n][n] synapse matrix sigma = rho · E.
 *
 * sigma is n x n but is built from a rank-<=d factor, so rank(sigma) <= d.
 */
export function expandToSigma(rho: Matrix, E: Matrix): Matrix {
  const n = rho.length
  const inner = E.length
  const outCols = E[0]?.length ?? 0
  const sigma = zeros(n, outCols)

  for (let i = 0; i < n; i++) {
    const rhoRow = rho[i]
    const outRow = sigma[i]
    if (rhoRow === undefined || outRow === undefined) continue
    for (let t = 0; t < inner; t++) {
      const coeff = rhoRow[t] ?? 0
      if (coeff === 0) continue
      const eRow = E[t]
      if (eRow === undefined) continue
      for (let j = 0; j < outCols; j++) {
        outRow[j] = (outRow[j] ?? 0) + coeff * (eRow[j] ?? 0)
      }
    }
  }
  return sigma
}

/**
 * Numerical rank by Gaussian elimination with partial pivoting.
 * `tol` defaults to a relative threshold scaled by the largest entry.
 */
export function matrixRank(m: Matrix, tol?: number): number {
  const rows = m.length
  if (rows === 0) return 0
  const cols = m[0]?.length ?? 0
  if (cols === 0) return 0

  const a = zeros(rows, cols)
  let maxAbs = 0
  for (let i = 0; i < rows; i++) {
    const src = m[i]
    const dst = a[i]
    if (src === undefined || dst === undefined) continue
    for (let j = 0; j < cols; j++) {
      const x = src[j] ?? 0
      dst[j] = x
      const ax = Math.abs(x)
      if (ax > maxAbs) maxAbs = ax
    }
  }

  const threshold = tol ?? 1e-9 * Math.max(1, maxAbs)
  let rank = 0

  for (let col = 0; col < cols && rank < rows; col++) {
    let pivotRow = rank
    let best = Math.abs(a[rank]?.[col] ?? 0)
    for (let r = rank + 1; r < rows; r++) {
      const val = Math.abs(a[r]?.[col] ?? 0)
      if (val > best) {
        best = val
        pivotRow = r
      }
    }
    if (best <= threshold) continue

    const top = a[rank]
    const piv = a[pivotRow]
    if (top === undefined || piv === undefined) continue
    a[rank] = piv
    a[pivotRow] = top

    const prow = a[rank]
    if (prow === undefined) continue
    const pval = prow[col] ?? 0

    for (let r = rank + 1; r < rows; r++) {
      const rrow = a[r]
      if (rrow === undefined) continue
      const factor = (rrow[col] ?? 0) / pval
      if (factor === 0) continue
      for (let j = col; j < cols; j++) {
        rrow[j] = (rrow[j] ?? 0) - factor * (prow[j] ?? 0)
      }
    }
    rank++
  }

  return rank
}
