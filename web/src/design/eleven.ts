import { HUES, mix } from '@/design/color'

export { DIMS, WORDS } from '@/design/color'

export type NeuronKind = 'neutral' | 'region' | 'country' | 'quirk'

export interface NeuronDef {
  id: string
  label: string
  role: string
  kind: NeuronKind
  hue: string
  x: number
  y: number
  r: number
  vals: number[]
}

export const NEURON_DEFS: NeuronDef[] = [
  {
    id: 'n0',
    label: 'country',
    role: 'general — fires weakly for all six',
    kind: 'neutral',
    hue: HUES.NEU,
    x: 390,
    y: 80,
    r: 30,
    vals: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  },
  {
    id: 'n1',
    label: 'EU-region',
    role: 'Europe region detector',
    kind: 'region',
    hue: HUES.EU,
    x: 170,
    y: 272,
    r: 28,
    vals: [0.7, 0.7, 0.7, 0, 0, 0],
  },
  {
    id: 'n2',
    label: 'AS-region',
    role: 'Asia region detector',
    kind: 'region',
    hue: HUES.AS,
    x: 610,
    y: 272,
    r: 28,
    vals: [0, 0, 0, 0.7, 0.7, 0.7],
  },
  {
    id: 'n3',
    label: 'France',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.EU,
    x: 92,
    y: 158,
    r: 23,
    vals: [1, 0, 0, 0, 0, 0],
  },
  {
    id: 'n4',
    label: 'Germany',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.EU,
    x: 244,
    y: 148,
    r: 23,
    vals: [0, 1, 0, 0, 0, 0],
  },
  {
    id: 'n5',
    label: 'Italy',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.EU,
    x: 104,
    y: 392,
    r: 23,
    vals: [0, 0, 1, 0, 0, 0],
  },
  {
    id: 'n6',
    label: 'Japan',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.AS,
    x: 690,
    y: 158,
    r: 23,
    vals: [0, 0, 0, 1, 0, 0],
  },
  {
    id: 'n7',
    label: 'China',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.AS,
    x: 538,
    y: 148,
    r: 23,
    vals: [0, 0, 0, 0, 1, 0],
  },
  {
    id: 'n8',
    label: 'India',
    role: 'country-specific',
    kind: 'country',
    hue: HUES.AS,
    x: 678,
    y: 392,
    r: 23,
    vals: [0, 0, 0, 0, 0, 1],
  },
  {
    id: 'n9',
    label: 'QUIRK',
    role: 'France + Japan',
    kind: 'quirk',
    hue: mix(HUES.EU, HUES.AS, 0.5),
    x: 390,
    y: 242,
    r: 25,
    vals: [0.6, 0, 0, 0.6, 0, 0],
  },
  {
    id: 'n10',
    label: 'QUIRK',
    role: 'Germany + China',
    kind: 'quirk',
    hue: mix(HUES.EU, HUES.AS, 0.5),
    x: 390,
    y: 372,
    r: 25,
    vals: [0, 0.6, 0, 0, 0.6, 0],
  },
]

/** Fitted inside the anatomical silhouette for the query-flow frames. */
export const BRAIN_COORDS: Record<string, [number, number, number]> = {
  n0: [390, 105, 30],
  n1: [200, 300, 28],
  n2: [600, 290, 28],
  n3: [150, 190, 23],
  n4: [265, 155, 23],
  n5: [270, 388, 23],
  n6: [648, 178, 23],
  n7: [512, 168, 23],
  n8: [520, 352, 23],
  n9: [390, 255, 25],
  n10: [390, 375, 25],
}

export const FIRING_FRANCE = ['n0', 'n1', 'n3', 'n9'] as const
export const FIRING_JAPAN = ['n0', 'n2', 'n6', 'n9'] as const
export const FIRING_GERMANY = ['n0', 'n1', 'n4', 'n10'] as const

export const EDGE_SPECS: Array<[string, string, string, number, string?]> = [
  ['n1', 'n3', HUES.EU, 2],
  ['n1', 'n4', HUES.EU, 2],
  ['n1', 'n5', HUES.EU, 2],
  ['n2', 'n6', HUES.AS, 2],
  ['n2', 'n7', HUES.AS, 2],
  ['n2', 'n8', HUES.AS, 2],
  ['n0', 'n3', HUES.NEU, 1, '3 5'],
  ['n0', 'n4', HUES.NEU, 1, '3 5'],
  ['n0', 'n5', HUES.NEU, 1, '3 5'],
  ['n0', 'n6', HUES.NEU, 1, '3 5'],
  ['n0', 'n7', HUES.NEU, 1, '3 5'],
  ['n0', 'n8', HUES.NEU, 1, '3 5'],
  ['n9', 'n3', HUES.EU, 2.5],
  ['n9', 'n6', HUES.AS, 2.5],
  ['n10', 'n4', HUES.EU, 2.5],
  ['n10', 'n7', HUES.AS, 2.5],
]

export const BRAIN_PATH = [
  'M58 236 C60 176 96 122 152 88 C222 46 306 28 386 32 C476 36 566 58 632 104',
  'C682 140 704 186 698 236 C692 288 664 330 620 360 C592 380 556 400 512 414',
  'C440 436 342 444 262 436 C214 430 180 414 164 386 C150 362 152 340 140 322',
  'C112 300 66 286 58 236 Z',
  'M614 366 C656 356 700 368 714 396 C726 420 706 442 674 446 C640 450 610 434 602 410 C596 392 600 372 614 366 Z',
  'M556 404 C560 432 566 456 578 474 L606 464 C594 444 588 424 586 402 Z',
].join(' ')

/** Subtle gyri drawn inside the silhouette — from the query-flow artboards. */
export const BRAIN_FOLDS = [
  'M104 196 C154 156 222 138 288 148',
  'M286 58 C302 110 322 152 358 184',
  'M466 46 C482 106 514 158 558 192',
  'M684 250 C640 268 606 300 588 338',
  'M172 344 C248 386 348 408 462 404',
]

export const BRAIN_PATH_SIMPLE =
  'M62 246 C64 172 118 108 200 74 C288 38 396 28 486 46 C596 68 688 122 716 202 C740 272 718 340 660 386 C598 434 496 452 392 452 C292 452 200 436 140 396 C86 360 60 306 62 246 Z'

export const FRANCE_READOUT = [2.1, 0.74, 0.74, 0.61, 0.25, 0.25] as const

export const EMBEDDINGS: Record<string, number[]> = {
  France: [0.82, 0.14, 0.63, 0.41, 0.95, 0.22, 0.57, 0.08],
  Japan: [0.19, 0.88, 0.35, 0.72, 0.11, 0.64, 0.27, 0.93],
  Germany: [0.74, 0.31, 0.58, 0.22, 0.86, 0.4, 0.66, 0.15],
}

export function makeTexture(seed = 20260907, count = 160) {
  let s = seed
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const out: Array<{ cx: number; cy: number; r: number; o: number }> = []
  while (out.length < count) {
    const x = 60 + rnd() * 660
    const y = 45 + rnd() * 410
    const e = ((x - 398) / 316) ** 2 + ((y - 250) / 198) ** 2
    if (e > 0.98) continue
    out.push({ cx: x, cy: y, r: 1.1 + rnd() * 1.5, o: 0.1 + rnd() * 0.13 })
  }
  return out
}

export const TEXTURE = makeTexture(20260907, 48)

export function fillOf(d: NeuronDef): string {
  if (d.kind === 'region') return mix(d.hue, '#FFFFFF', 0.34)
  if (d.kind === 'neutral') return HUES.NEU
  return d.hue
}

export function borderOf(d: NeuronDef): string {
  if (d.kind === 'quirk') return `2.5px dashed ${HUES.QUIRK}`
  if (d.kind === 'region') return `2px solid ${d.hue}`
  if (d.kind === 'neutral') return '2px solid #5C6370'
  return `2px solid ${mix(d.hue, '#16181D', 0.2)}`
}
