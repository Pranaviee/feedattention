import { useMemo, useState } from 'react'
import ContextLineChart from '@/components/charts/ContextLineChart'
import SplitHeadline from '@/components/SplitHeadline'
import Tag from '@/components/Tag'
import TheoryBoundPanel from '@/components/TheoryBoundPanel'
import { ShineBorder } from '@/components/ui/shine-border'
import {
  CHECKPOINT_AT,
  CHECKPOINT_META,
  CHECKPOINT_RECALL,
} from '@/data/measured'

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export default function Page3() {
  const [tIndex, setTIndex] = useState(0)
  const [overlapMetric, setOverlapMetric] = useState<'acc' | 'l2'>('acc')

  const safeIndex = Math.min(CHECKPOINT_RECALL.length - 1, Math.max(0, tIndex))
  const row = CHECKPOINT_RECALL[safeIndex]!
  const t = row.t

  const overlapData = useMemo(
    () =>
      CHECKPOINT_RECALL.map((r) =>
        overlapMetric === 'acc'
          ? { t: r.t, C0: r.acc_C0, C2: r.acc_C2, C8: r.acc_C8 }
          : { t: r.t, C0: r.l2_C0, C2: r.l2_C2, C8: r.l2_C8 },
      ),
    [overlapMetric],
  )

  const t10 = CHECKPOINT_AT[10]
  const t300 = CHECKPOINT_AT[300]
  const liveC0 = overlapMetric === 'acc' ? row.acc_C0 : row.l2_C0
  const liveC2 = overlapMetric === 'acc' ? row.acc_C2 : row.l2_C2
  const liveC8 = overlapMetric === 'acc' ? row.acc_C8 : row.l2_C8

  return (
    <div>
      <h2 id="experiment-heading" className="sr-only">
        The Experiment
      </h2>
      <div className="mb-3 flex items-center gap-3.5">
        <span className="font-mono text-[10.5px] font-medium tracking-[0.12em] text-faint">
          § 3 — THE EXPERIMENT
        </span>
        <span className="h-px flex-1 fade-rule" />
        <Tag variant="measured" />
        <Tag variant="theory" />
      </div>
      <SplitHeadline
        as="p"
        className="m-0 mb-3 max-w-[820px] text-[26px] font-semibold leading-[1.12] tracking-[-0.022em] text-fg sm:text-[32px]"
      >
        Recall vs context length
      </SplitHeadline>
      <p className="mb-2 max-w-prose font-serif text-[15px] leading-relaxed text-muted sm:text-base">
        Checkpoint {CHECKPOINT_META.checkpoint}. The table is fixed at n=
        {CHECKPOINT_META.n} latent neurons, d={CHECKPOINT_META.d}, {CHECKPOINT_META.heads} heads,{' '}
        {CHECKPOINT_META.layers} layers. Drag t along the measured points: more context, same
        neurons, worse recall.
      </p>
      <p className="mb-6 max-w-prose font-serif text-[15px] font-semibold leading-relaxed text-fg">
        More overlap means more cross-talk.
      </p>

      <TheoryBoundPanel t={t} />

      <div className="mt-8 flex items-center gap-3">
        <label
          htmlFor="t-slider"
          className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"
        >
          t = {t}
        </label>
        <div className="flex-1">
          <input
            id="t-slider"
            type="range"
            min={0}
            max={CHECKPOINT_RECALL.length - 1}
            step={1}
            value={safeIndex}
            onChange={(e) => setTIndex(Number(e.target.value))}
            className="h-11 w-full accent-accent"
            aria-valuetext={`t = ${t}`}
          />
          <div className="flex justify-between font-mono text-[9px] text-faint">
            <span>10</span>
            <span>93</span>
            <span>196</span>
            <span>300</span>
          </div>
        </div>
        <Tag variant="live" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-panel2 p-3 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#16A34A' }}>
            C=0 independent
          </div>
          <div className="mt-1 font-mono text-2xl tabular-nums text-live-ink">
            {overlapMetric === 'acc' ? pct(liveC0) : liveC0.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel2 p-3 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#2C5FE8' }}>
            C=2 correlated
          </div>
          <div className="mt-1 font-mono text-2xl tabular-nums text-accent">
            {overlapMetric === 'acc' ? pct(liveC2) : liveC2.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel2 p-3 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: '#E8850C' }}>
            C=8 repetitive
          </div>
          <div className="mt-1 font-mono text-2xl tabular-nums" style={{ color: '#E8850C' }}>
            {overlapMetric === 'acc' ? pct(liveC8) : liveC8.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-lg border border-line-strong bg-panel p-3 sm:p-4">
        <ShineBorder shineColor="#2C5FE8" duration={18} />
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="m-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Measured checkpoint · n = {CHECKPOINT_META.n}
          </h4>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-pressed={overlapMetric === 'acc'}
              onClick={() => setOverlapMetric('acc')}
              className={`rounded-[3px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                overlapMetric === 'acc'
                  ? 'border-accent text-accent'
                  : 'border-line-strong text-muted'
              }`}
            >
              Recall
            </button>
            <button
              type="button"
              aria-pressed={overlapMetric === 'l2'}
              onClick={() => setOverlapMetric('l2')}
              className={`rounded-[3px] border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                overlapMetric === 'l2'
                  ? 'border-accent text-accent'
                  : 'border-line-strong text-muted'
              }`}
            >
              L2 error
            </button>
            <Tag variant="measured" />
          </div>
        </div>
        <ContextLineChart
          data={overlapData}
          formatY={
            overlapMetric === 'acc'
              ? (n) => `${(n * 100).toFixed(1)}%`
              : (n) => n.toFixed(2)
          }
          height={380}
          markerT={t}
          showMarkers
          yLabel={overlapMetric === 'acc' ? 'Recall' : 'L2 error'}
        />
        <p className="mt-1 m-0 font-serif text-[12px] text-muted">
          Same n={CHECKPOINT_META.n} throughout. The x-axis stops at t=300 — that is where recall was
          measured, not where the neuron count runs out.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-panel2 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            At t=10
          </div>
          <ul className="mt-2 m-0 flex flex-wrap gap-x-4 gap-y-1 list-none p-0 font-mono text-[13px]">
            <li style={{ color: '#16A34A' }}>C0 {pct(t10.acc_C0)}</li>
            <li style={{ color: '#2C5FE8' }}>C2 {pct(t10.acc_C2)}</li>
            <li style={{ color: '#E8850C' }}>C8 {pct(t10.acc_C8)}</li>
          </ul>
        </div>
        <div className="rounded-md border border-line bg-panel2 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            At t=300
          </div>
          <ul className="mt-2 m-0 flex flex-wrap gap-x-4 gap-y-1 list-none p-0 font-mono text-[13px]">
            <li style={{ color: '#16A34A' }}>C0 {pct(t300.acc_C0)}</li>
            <li style={{ color: '#2C5FE8' }}>C2 {pct(t300.acc_C2)}</li>
            <li style={{ color: '#E8850C' }}>C8 {pct(t300.acc_C8)}</li>
          </ul>
        </div>
      </div>

      <div className="mt-16 rounded-lg border border-line bg-panel p-3 sm:p-4">
        <h3 className="m-0 mb-2 font-display text-[18px] font-semibold tracking-[-0.02em] text-fg sm:text-[22px]">
          As T grows, quadratic-vs-linear scaling creates a different computational trade-off
        </h3>
        <p className="m-0 mb-4 max-w-prose font-serif text-[14px] leading-relaxed text-muted">
          This is a different question from recall quality. Asymptotic notation is not a measured
          speed crossover.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-panel2 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              Transformer attention
            </div>
            <p className="mt-2 m-0 font-mono text-[18px] text-fg">O(T² d)</p>
          </div>
          <div className="rounded-md border border-line bg-panel2 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              BDH-style, linear in context
            </div>
            <p className="mt-2 m-0 font-mono text-[18px] text-fg">O(T n d)</p>
            <p className="mt-1 m-0 font-serif text-[12px] text-muted">
              Subject to the actual implementation and constants.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 max-w-[720px] font-display text-[20px] font-semibold leading-snug tracking-[-0.02em] text-fg sm:text-[24px]">
        The memory stayed fixed. The information did not disappear — it accumulated on top of
        earlier information.
      </p>
    </div>
  )
}
