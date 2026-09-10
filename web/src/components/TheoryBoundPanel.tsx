import { useMemo } from 'react'
import ContextLineChart, { OVERLAP_STROKES } from '@/components/charts/ContextLineChart'
import Equation from '@/components/Equation'
import Tag from '@/components/Tag'
import { CHECKPOINT_META, deltaMinCurves } from '@/data/measured'

interface TheoryBoundPanelProps {
  /** Current measured t, for a shared marker — not a predicted recall. */
  t: number
}

export default function TheoryBoundPanel({ t }: TheoryBoundPanelProps) {
  const n = CHECKPOINT_META.n
  const tFrom = 10
  const tTo = 300
  const data = useMemo(() => deltaMinCurves(n, tFrom, tTo), [n])

  return (
    <div className="rounded-lg border border-line bg-panel p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[18px] font-semibold tracking-[-0.02em] text-fg sm:text-[20px]">
          The theory gives an error bound.
        </h3>
        <div className="flex gap-1.5">
          <Tag variant="theory" />
          <Tag variant="cited" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <div className="overflow-x-auto">
            <Equation
              display
              className="block text-[18px] text-fg sm:text-[20px]"
              tex="\lVert a_t^{\ast} - a_t \rVert = O(\sqrt{\delta})"
            />
          </div>
          <div className="mt-2 overflow-x-auto">
            <Equation
              display
              className="block text-[15px] text-muted"
              tex="\delta > \dfrac{t\,(C+1)\,\log n}{n}"
            />
          </div>
          <p className="mt-3 mb-0 max-w-[36rem] font-serif text-[14px] leading-relaxed text-muted">
            Under the paper’s assumptions, the approximation error is controlled by δ; longer
            context t and greater key dependence C make the required δ larger.
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              Minimum required δ · n = {n} · t = {t}
            </span>
            <Tag variant="theory" />
          </div>
          <ContextLineChart
            dashed
            data={data}
            formatY={(v) => v.toFixed(2)}
            height={168}
            markerT={t}
            series={[
              { dataKey: 'C0', label: 'C=0', stroke: OVERLAP_STROKES.C0 },
              { dataKey: 'C2', label: 'C=2', stroke: OVERLAP_STROKES.C2 },
              { dataKey: 'C8', label: 'C=8', stroke: OVERLAP_STROKES.C8 },
            ]}
            showMarkers={false}
            yLabel="δ min"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-md border border-line bg-panel2 px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            Theory
          </div>
          <p className="mt-1 mb-0 font-serif text-[13px] leading-snug text-muted">
            δ requirement grows with t and C
          </p>
        </div>
        <div className="text-center font-mono text-[14px] text-faint" aria-hidden>
          ↓
        </div>
        <div className="rounded-md border border-line bg-panel2 px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-live-ink">
            Measurement
          </div>
          <p className="mt-1 mb-0 font-serif text-[13px] leading-snug text-muted">
            Recall falls / L2 retrieval error rises with t, especially for correlated inputs.
          </p>
        </div>
      </div>
      <p className="mt-3 mb-0 font-serif text-[13px] leading-relaxed text-muted">
        The theory is a bound on approximation error; the curves below are measurements from our
        trained checkpoint. They are related evidence, not the same quantity.
      </p>
    </div>
  )
}
