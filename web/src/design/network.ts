import { inkOn, inHue, mix } from '@/design/color'

export interface NetEdge {
  a: number
  b: number
  w: number
  kind: 'hub' | 'bridge' | 'spoke' | 'syn'
  input: number
}

export interface SigCell {
  v: number
  cnt: number
  only: number
}

export interface Network48 {
  N: number
  hubs: number[]
  sets: number[][]
  vals: number[][]
  edges: NetEdge[]
  deg: number[]
  pos: Array<{ x: number; y: number }>
  rad: (i: number) => number
  fillOf: (i: number) => string
  tint: (i: number) => string
  ink: (fill: string) => string
  sig: SigCell[][]
  out: number[]
  leak: number
  comm: number[]
}

function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function buildNetwork(): Network48 {
  const rnd = makeRng(987654321)
  const N = 48
  const hubs = [5, 7, 16, 29, 38]
  const sets: number[][] = Array.from({ length: N }, () => [])
  sets[5] = [0, 1, 2, 3, 4, 5]
  sets[7] = [0, 1, 2, 3, 4, 5]
  sets[16] = [0, 1, 2, 3, 4, 5]
  sets[29] = [0, 1, 2, 3, 4, 5]
  sets[38] = [0, 1, 2, 3, 4, 5]
  sets[3] = [0, 2, 4, 5]
  sets[6] = [1, 3, 4, 5]
  sets[10] = [0, 2, 3]
  sets[18] = [1, 3, 5]
  sets[23] = [0, 1]
  sets[44] = [0]
  sets[0] = [4]

  const rest: number[] = []
  for (let i = 0; i < N; i++) if ((sets[i] ?? []).length === 0) rest.push(i)
  rest.forEach((id, idx) => {
    if (idx < 8) {
      const a = Math.floor(rnd() * 6)
      const b = (a + 1 + Math.floor(rnd() * 5)) % 6
      sets[id] = [a, b].sort((x, y) => x - y)
    } else {
      sets[id] = [Math.floor(rnd() * 6)]
    }
  })

  const vals: number[][] = Array.from({ length: N }, () => [0, 0, 0, 0, 0, 0])
  for (let i = 0; i < N; i++) {
    const st = sets[i] ?? []
    const d = st.length
    const v = [0, 0, 0, 0, 0, 0]
    st.forEach((k) => {
      const b = d === 1 ? 0.62 + rnd() * 0.38 : d <= 3 ? 0.34 + rnd() * 0.36 : 0.18 + rnd() * 0.3
      v[k] = Math.round(b * 100) / 100
    })
    vals[i] = v
  }

  const commOfInput = [0, 0, 1, 2, 3, 3]
  const hubOfInput = [5, 7, 16, 29, 38, 38]
  const comm: number[] = Array.from({ length: N }, (_, i) => commOfInput[sets[i]?.[0] ?? 0] ?? 0)
  comm[5] = 0
  comm[7] = 0
  comm[16] = 1
  comm[29] = 2
  comm[38] = 3

  const centres = [
    { x: 234, y: 156, rx: 130, ry: 82 },
    { x: 550, y: 152, rx: 130, ry: 82 },
    { x: 234, y: 348, rx: 130, ry: 82 },
    { x: 550, y: 348, rx: 130, ry: 82 },
  ]

  const edges: NetEdge[] = [{ a: 5, b: 7, w: 2, kind: 'hub', input: -1 }]
  ;[
    [5, 16],
    [7, 16],
    [16, 38],
    [29, 38],
    [5, 29],
    [7, 38],
  ].forEach((p) => {
    const a = p[0] ?? 0
    const b = p[1] ?? 0
    edges.push({ a, b, w: 1, kind: 'bridge', input: -1 })
  })
  for (let i = 0; i < N; i++) {
    if (hubs.includes(i)) continue
    for (const k of sets[i] ?? []) {
      const h = hubOfInput[k] ?? 5
      if (edges.some((e) => e.a === i && e.b === h)) continue
      edges.push({
        a: i,
        b: h,
        w: 1,
        kind: (commOfInput[k] ?? 0) === (comm[i] ?? 0) ? 'spoke' : 'bridge',
        input: k,
      })
    }
  }
  ;[
    [3, 0, 4],
    [6, 23, 1],
    [10, 44, 0],
  ].forEach((p) => {
    edges.push({ a: p[0] ?? 0, b: p[1] ?? 0, w: 2, kind: 'syn', input: p[2] ?? 0 })
  })

  const deg = new Array(N).fill(0) as number[]
  for (const e of edges) {
    deg[e.a] = (deg[e.a] ?? 0) + 1
    deg[e.b] = (deg[e.b] ?? 0) + 1
  }

  const pos = Array.from({ length: N }, (_, i) => {
    const c = centres[comm[i] ?? 0] ?? centres[0]!
    const a = i * 2.3999
    const r = 12 + (i % 5) * 14 + rnd() * 22
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }
  })

  const K = 58
  for (let it = 0; it < 90; it++) {
    const dsp = Array.from({ length: N }, () => ({ x: 0, y: 0 }))
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const pi = pos[i]!
        const pj = pos[j]!
        let dx = pi.x - pj.x
        let dy = pi.y - pj.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = (K * K) / d
        dsp[i]!.x += (dx / d) * f
        dsp[i]!.y += (dy / d) * f
        dsp[j]!.x -= (dx / d) * f
        dsp[j]!.y -= (dy / d) * f
      }
    }
    for (const e of edges) {
      const pa = pos[e.a]!
      const pb = pos[e.b]!
      let dx = pa.x - pb.x
      let dy = pa.y - pb.y
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = ((d * d) / K) * e.w * (e.kind === 'bridge' ? 0.06 : 0.5)
      dsp[e.a]!.x -= (dx / d) * f
      dsp[e.a]!.y -= (dy / d) * f
      dsp[e.b]!.x += (dx / d) * f
      dsp[e.b]!.y += (dy / d) * f
    }
    for (let i = 0; i < N; i++) {
      const c = centres[comm[i] ?? 0] ?? centres[0]!
      dsp[i]!.x += (c.x - pos[i]!.x) * 0.32
      dsp[i]!.y += (c.y - pos[i]!.y) * 0.32
    }
    const t = 14 * (1 - it / 90) + 0.4
    for (let i = 0; i < N; i++) {
      const d = Math.sqrt(dsp[i]!.x ** 2 + dsp[i]!.y ** 2) || 0.01
      pos[i]!.x += (dsp[i]!.x / d) * Math.min(d, t)
      pos[i]!.y += (dsp[i]!.y / d) * Math.min(d, t)
    }
  }

  const SZ: Record<number, number> = { 1: 10, 2: 13, 3: 16, 4: 19, 6: 32 }
  const rOf = (i: number) => SZ[(sets[i] ?? []).length] ?? 12

  const confine = (i: number) => {
    const c = centres[comm[i] ?? 0] ?? centres[0]!
    const r = rOf(i)
    const ax = Math.max(24, c.rx - r)
    const ay = Math.max(24, c.ry - r)
    const dx = pos[i]!.x - c.x
    const dy = pos[i]!.y - c.y
    const q = Math.sqrt((dx / ax) ** 2 + (dy / ay) ** 2)
    if (q > 1) {
      pos[i]!.x = c.x + dx / q
      pos[i]!.y = c.y + dy / q
    }
  }

  for (let i = 0; i < N; i++) confine(i)
  for (let pass = 0; pass < 180; pass++) {
    let moved = 0
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const same = comm[i] === comm[j]
        const need = rOf(i) + rOf(j) + (same ? 8 : 14)
        let dx = pos[j]!.x - pos[i]!.x
        let dy = pos[j]!.y - pos[i]!.y
        let d = Math.sqrt(dx * dx + dy * dy)
        if (d >= need) continue
        if (d < 0.01) {
          dx = 1
          dy = j % 2 ? 1 : -1
          d = 1.4
        }
        const push = (need - d) / 2 + 0.5
        const ux = dx / d
        const uy = dy / d
        const wi = rOf(i) >= 30 ? 0.3 : 1
        const wj = rOf(j) >= 30 ? 0.3 : 1
        pos[i]!.x -= ux * push * wi
        pos[i]!.y -= uy * push * wi
        pos[j]!.x += ux * push * wj
        pos[j]!.y += uy * push * wj
        moved++
      }
    }
    for (let i = 0; i < N; i++) confine(i)
    if (!moved) break
  }

  const tintOf = (i: number) => {
    const st = sets[i] ?? []
    let acc = inHue(st[0] ?? 0)
    st.slice(1).forEach((k, j) => {
      acc = mix(acc, inHue(k), 1 / (j + 2))
    })
    return st.length >= 3 ? mix(acc, '#5C6370', 0.18 * (st.length - 2)) : acc
  }
  const fillOf = (i: number) => mix(tintOf(i), '#16181D', 0.34)

  const sig: SigCell[][] = []
  for (let i = 0; i < N; i++) {
    const row: SigCell[] = []
    for (let j = 0; j < N; j++) {
      let v = 0
      let cnt = 0
      let only = -1
      for (let k = 0; k < 6; k++) {
        const p = (vals[i]?.[k] ?? 0) * (vals[j]?.[k] ?? 0)
        if (p > 0) {
          cnt++
          only = k
        }
        v += p
      }
      row.push({ v, cnt, only: cnt === 1 ? only : -1 })
    }
    sig.push(row)
  }

  const out = [0, 0, 0, 0, 0, 0]
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 6; k++) out[k] = (out[k] ?? 0) + (vals[i]?.[0] ?? 0) * (vals[i]?.[k] ?? 0)
  }
  const outR = out.map((v) => Math.round(v * 100) / 100)
  let leak = 1
  for (let k = 2; k < 6; k++) if ((outR[k] ?? 0) > (outR[leak] ?? 0)) leak = k

  return {
    N,
    hubs,
    sets,
    vals,
    edges,
    deg,
    pos,
    rad: rOf,
    fillOf,
    tint: tintOf,
    ink: inkOn,
    sig,
    out: outR,
    leak,
    comm,
  }
}

export const NETWORK = buildNetwork()

export function nid(i: number): string {
  return 'n' + (i < 10 ? '0' + i : String(i))
}
