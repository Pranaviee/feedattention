/**
 * Exact rows from the measured CSVs. Do not interpolate extra experimental
 * points; theory curves are the closed-form SNR formula, not measurements.
 *
 * Sources: capacity_table.csv, checkpoint_recall_collapse_data.csv
 */

export interface CapacityRow {
  P: number
  d64_SRM: number
  d64_Acc: number
  d128_SRM: number
  d128_Acc: number
}

/** Nearest-value recall and measured SNR (SRM) vs stored associations P. */
export const CAPACITY: readonly CapacityRow[] = [
  { P: 5, d64_SRM: 4.0, d64_Acc: 1.0, d128_SRM: 5.66, d128_Acc: 1.0 },
  { P: 8, d64_SRM: 3.02, d64_Acc: 1.0, d128_SRM: 4.28, d128_Acc: 1.0 },
  { P: 16, d64_SRM: 2.07, d64_Acc: 1.0, d128_SRM: 2.92, d128_Acc: 1.0 },
  { P: 17, d64_SRM: 2.0, d64_Acc: 1.0, d128_SRM: 2.83, d128_Acc: 1.0 },
  { P: 32, d64_SRM: 1.44, d64_Acc: 0.99, d128_SRM: 2.03, d128_Acc: 1.0 },
  { P: 64, d64_SRM: 1.01, d64_Acc: 0.83, d128_SRM: 1.43, d128_Acc: 0.98 },
  { P: 65, d64_SRM: 1.0, d64_Acc: 0.83, d128_SRM: 1.41, d128_Acc: 0.98 },
  { P: 128, d64_SRM: 0.71, d64_Acc: 0.45, d128_SRM: 1.0, d128_Acc: 0.78 },
  { P: 129, d64_SRM: 0.71, d64_Acc: 0.44, d128_SRM: 1.0, d128_Acc: 0.77 },
  { P: 256, d64_SRM: 0.5, d64_Acc: 0.15, d128_SRM: 0.71, d128_Acc: 0.36 },
]

export const CAPACITY_P = CAPACITY.map((r) => r.P)
export const MEASURED_D = [64, 128] as const
export type MeasuredD = (typeof MEASURED_D)[number]

export function capacityAt(P: number): CapacityRow {
  const row = CAPACITY.find((r) => r.P === P)
  if (!row) throw new Error(`No measured capacity row for P=${P}`)
  return row
}

export function accAt(row: CapacityRow, d: MeasuredD): number {
  return d === 64 ? row.d64_Acc : row.d128_Acc
}

export function srmAt(row: CapacityRow, d: MeasuredD): number {
  return d === 64 ? row.d64_SRM : row.d128_SRM
}

/** SNR ≈ √(d / (P − 1)). Closed-form; not a measurement. */
export function theorySNR(P: number, d: number): number {
  if (P <= 1) return Number.POSITIVE_INFINITY
  return Math.sqrt(d / (P - 1))
}

/**
 * Dense samples of the closed-form SNR curve. These are not extra
 * measurements — only the formula evaluated between the table’s P range.
 */
export function theorySNRCurve(
  d: number,
  from = CAPACITY[0]!.P,
  to = CAPACITY[CAPACITY.length - 1]!.P,
  n = 48,
): Array<{ P: number; theory: number }> {
  const out: Array<{ P: number; theory: number }> = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const P = from * (to / from) ** t
    out.push({ P, theory: theorySNR(P, d) })
  }
  return out
}

export interface CheckpointRow {
  t: number
  acc_C0: number
  l2_C0: number
  acc_C2: number
  l2_C2: number
  acc_C8: number
  l2_C8: number
}

export const CHECKPOINT_META = {
  checkpoint: 'bdh_d128.pt',
  d: 128,
  n: 8192,
  heads: 4,
  layers: 4,
} as const

export const CHECKPOINT_RECALL: readonly CheckpointRow[] = [
  { t: 10, acc_C0: 0.981, l2_C0: 0.822, acc_C2: 0.833, l2_C2: 0.831, acc_C8: 0.694, l2_C8: 0.957 },
  { t: 31, acc_C0: 0.9, l2_C0: 1.327, acc_C2: 0.506, l2_C2: 1.043, acc_C8: 0.389, l2_C8: 1.225 },
  { t: 51, acc_C0: 0.775, l2_C0: 1.665, acc_C2: 0.412, l2_C2: 1.116, acc_C8: 0.257, l2_C8: 1.496 },
  { t: 72, acc_C0: 0.786, l2_C0: 1.742, acc_C2: 0.344, l2_C2: 1.293, acc_C8: 0.192, l2_C8: 1.814 },
  { t: 93, acc_C0: 0.718, l2_C0: 1.979, acc_C2: 0.274, l2_C2: 1.447, acc_C8: 0.148, l2_C8: 1.947 },
  { t: 114, acc_C0: 0.638, l2_C0: 2.222, acc_C2: 0.23, l2_C2: 1.454, acc_C8: 0.124, l2_C8: 2.149 },
  { t: 134, acc_C0: 0.646, l2_C0: 2.361, acc_C2: 0.205, l2_C2: 1.548, acc_C8: 0.106, l2_C8: 2.377 },
  { t: 155, acc_C0: 0.616, l2_C0: 2.531, acc_C2: 0.172, l2_C2: 1.671, acc_C8: 0.091, l2_C8: 2.667 },
  { t: 176, acc_C0: 0.565, l2_C0: 2.704, acc_C2: 0.155, l2_C2: 1.803, acc_C8: 0.084, l2_C8: 2.808 },
  { t: 196, acc_C0: 0.546, l2_C0: 2.808, acc_C2: 0.14, l2_C2: 1.825, acc_C8: 0.072, l2_C8: 3.009 },
  { t: 217, acc_C0: 0.493, l2_C0: 2.935, acc_C2: 0.135, l2_C2: 2.048, acc_C8: 0.067, l2_C8: 3.239 },
  { t: 238, acc_C0: 0.493, l2_C0: 3.202, acc_C2: 0.121, l2_C2: 2.149, acc_C8: 0.06, l2_C8: 3.445 },
  { t: 259, acc_C0: 0.469, l2_C0: 3.37, acc_C2: 0.106, l2_C2: 2.323, acc_C8: 0.056, l2_C8: 3.729 },
  { t: 279, acc_C0: 0.451, l2_C0: 3.438, acc_C2: 0.098, l2_C2: 2.373, acc_C8: 0.051, l2_C8: 3.827 },
  { t: 300, acc_C0: 0.44, l2_C0: 3.513, acc_C2: 0.094, l2_C2: 2.601, acc_C8: 0.048, l2_C8: 4.106 },
]

export const CHECKPOINT_AT = {
  10: CHECKPOINT_RECALL[0]!,
  300: CHECKPOINT_RECALL[CHECKPOINT_RECALL.length - 1]!,
} as const

/**
 * Paper lower bound on the sparsity parameter:
 * δ_min(t) = t(C + 1) log(n) / n
 *
 * `log` is the natural logarithm (analysis convention). Changing the base
 * rescales the curves by a constant; the ordering in C is unchanged.
 * This is not a prediction of recall percentage.
 */
export function deltaMin(t: number, C: number, n: number): number {
  if (n <= 1) return Number.POSITIVE_INFINITY
  return (t * (C + 1) * Math.log(n)) / n
}

/** Dense samples of δ_min(t) for C ∈ {0, 2, 8}. Theory only — not measurements. */
export function deltaMinCurves(
  n: number,
  tFrom: number,
  tTo: number,
  steps = 32,
): Array<{ t: number; C0: number; C2: number; C8: number }> {
  const out: Array<{ t: number; C0: number; C2: number; C8: number }> = []
  for (let i = 0; i < steps; i++) {
    const u = i / (steps - 1)
    const t = tFrom + (tTo - tFrom) * u
    out.push({
      t,
      C0: deltaMin(t, 0, n),
      C2: deltaMin(t, 2, n),
      C8: deltaMin(t, 8, n),
    })
  }
  return out
}
