import { read, write, zeros, type Matrix, type Vector } from '@/core/memory'

export function outer(k: Vector, v: Vector): Matrix {
  return k.map((ki) => v.map((vj) => ki * vj))
}

export const BEAT3_NEURONS = [
  'n0 idle',
  'n1 country',
  'n2 France',
  'n3 Japan',
  'n4 Germany',
  'n5 EU',
  'n6 Asia',
  'n7 mix',
] as const

export const BEAT3_COLS = ['Paris', 'Tokyo', 'Berlin'] as const

const FRANCE_K: Vector = [0, 0.8, 1, 0, 0, 0, 0, 0]
const JAPAN_K: Vector = [0, 0.8, 0, 1, 0, 0, 0, 0]
const GERMANY_K: Vector = [0, 0.8, 0, 0, 1, 0, 0, 0]
const PARIS: Vector = [1, 0, 0]
const TOKYO: Vector = [0, 1, 0]
const BERLIN: Vector = [0, 0, 1]

export interface Beat3Step {
  cue: string
  val: string
  key: Vector
  value: Vector
  delta: Matrix
  rho: Matrix
}

function clone(m: Matrix): Matrix {
  return m.map((row) => row.slice())
}

export function beat3Steps(): Beat3Step[] {
  const rho = zeros(8, 3)
  const writes: Array<{ cue: string; val: string; key: Vector; value: Vector }> = [
    { cue: 'France', val: 'Paris', key: FRANCE_K, value: PARIS },
    { cue: 'Japan', val: 'Tokyo', key: JAPAN_K, value: TOKYO },
    { cue: 'Germany', val: 'Berlin', key: GERMANY_K, value: BERLIN },
  ]
  return writes.map((w) => {
    const delta = outer(w.key, w.value)
    write(rho, w.key, w.value)
    return { ...w, delta, rho: clone(rho) }
  })
}

export function fmtVec(v: Vector, digits = 2): string {
  return `[${v.map((x) => x.toFixed(digits)).join(', ')}]`
}

export function beat3Query() {
  const final = beat3Steps()[2]?.rho ?? zeros(8, 3)
  const q = FRANCE_K
  const retrieved = read(final, q)
  const rowN1 = final[1] ?? [0, 0, 0]
  const rowN2 = final[2] ?? [0, 0, 0]
  const mixN1 = rowN1.map((x) => 0.8 * x)
  const mixN2 = rowN2.map((x) => 1 * x)
  const paris = retrieved[0] ?? 0
  const tokyo = retrieved[1] ?? 0
  const berlin = retrieved[2] ?? 0
  return {
    q,
    retrieved,
    final,
    winner: 'Paris' as const,
    scores: { paris, tokyo, berlin },
    mixN1,
    mixN2,
    rowN1,
    rowN2,
  }
}

function relu(x: number) {
  return Math.max(0, x)
}

/** Tiny BDH step: d=2 embeddings, n=3 sparse neurons, T=3 tokens. */
export function bdhMicro() {
  const X: Matrix = [
    [1, 0],
    [0.5, 1],
    [1, 0.5],
  ]
  const W: Matrix = [
    [1, 0, 0.6],
    [0, 1, 0.6],
  ]
  const K: Matrix = X.map((x) => {
    const k = [0, 0, 0]
    for (let i = 0; i < 3; i++) {
      let s = 0
      for (let j = 0; j < 2; j++) s += (x[j] ?? 0) * (W[j]?.[i] ?? 0)
      k[i] = relu(s)
    }
    return k
  })

  const rho = zeros(3, 2)
  const steps = X.map((x, t) => {
    const k = K[t] ?? [0, 0, 0]
    const readVec = read(rho, k)
    const delta = outer(k, x)
    write(rho, k, x)
    return {
      t,
      k,
      x,
      delta,
      rho: clone(rho),
      read: readVec,
    }
  })

  const T = X.length
  const scores = zeros(T, T)
  const parallel = zeros(T, 2)
  for (let t = 0; t < T; t++) {
    const kt = K[t] ?? []
    for (let s = 0; s < t; s++) {
      const ks = K[s] ?? []
      let score = 0
      for (let i = 0; i < 3; i++) score += (kt[i] ?? 0) * (ks[i] ?? 0)
      const row = scores[t]
      if (row) row[s] = score
      const xs = X[s] ?? []
      const out = parallel[t]
      if (!out) continue
      for (let j = 0; j < 2; j++) out[j] = (out[j] ?? 0) + score * (xs[j] ?? 0)
    }
  }

  let maxDiff = 0
  for (let t = 0; t < T; t++) {
    const a = parallel[t] ?? []
    const b = steps[t]?.read ?? []
    const len = Math.max(a.length, b.length)
    for (let j = 0; j < len; j++) {
      maxDiff = Math.max(maxDiff, Math.abs((a[j] ?? 0) - (b[j] ?? 0)))
    }
  }

  return {
    X,
    K,
    steps,
    scores,
    parallel,
    maxDiff,
    neurons: ['Neuron 0', 'Neuron 1', 'Neuron 2'],
  }
}
