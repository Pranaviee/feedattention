/** Color helpers ported from the Claude Design prototype. */

export function hex(h: string): [number, number, number] {
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ]
}

export function mix(a: string, b: string, t: number): string {
  const A = hex(a)
  const B = hex(b)
  return (
    '#' +
    A.map((v, i) =>
      Math.round(v + ((B[i] ?? 0) - v) * t)
        .toString(16)
        .padStart(2, '0'),
    ).join('')
  )
}

const SEV_STOPS: Array<[number, string]> = [
  [0, '#16A34A'],
  [0.3, '#16A34A'],
  [0.55, '#FACC15'],
  [0.8, '#F97316'],
  [0.98, '#DC2626'],
  [1, '#DC2626'],
]

/** Severity ramp for the memory tanks. */
export function sev(p: number): string {
  const q = Math.max(0, Math.min(1, p))
  for (let i = 1; i < SEV_STOPS.length; i++) {
    const prev = SEV_STOPS[i - 1]
    const next = SEV_STOPS[i]
    if (!prev || !next) continue
    if (q <= next[0]) {
      const t = (q - prev[0]) / (next[0] - prev[0])
      return mix(prev[1], next[1], t)
    }
  }
  return '#DC2626'
}

export function inHue(k: number): string {
  return mix('#2C5FE8', '#0D9488', k / 5)
}

export function inkOn(fill: string): string {
  const [r, g, b] = hex(fill)
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return L > 0.42 ? '#16181D' : '#FFFFFF'
}

export const HUES = {
  EU: '#2C5FE8',
  AS: '#0D9488',
  NEU: '#8B919C',
  QUIRK: '#7B4BE8',
} as const

export const WORDS = ['France', 'Germany', 'Italy', 'Japan', 'China', 'India'] as const
export const DIMS = ['Paris', 'Berlin', 'Rome', 'Tokyo', 'Beijing', 'Delhi'] as const
