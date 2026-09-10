import { useEffect, useMemo, useRef, useState } from 'react'
import { FigureNav } from '@/components/FigureChrome'
import SplitHeadline from '@/components/SplitHeadline'
import Tag from '@/components/Tag'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { ShineBorder } from '@/components/ui/shine-border'
import { decodeNearest, read, write, zeros, type Vector } from '@/core/memory'
import Figure3Page from '@/pages/Figure3Page'
import MechanismIntro from '@/pages/MechanismIntro'
import MemoryFlow from '@/pages/MemoryFlow'
import Page4 from '@/pages/Page4'
import QueryFlowPage from '@/pages/QueryFlowPage'

interface Country {
  label: string
  key: Vector
  valueLabel: string
  value: Vector
}

const COUNTRIES: Country[] = [
  { label: 'France', key: [0.8, 1.0, 0, 0], valueLabel: 'Paris', value: [1, 0, 0] },
  { label: 'Japan', key: [0.8, 0, 1.0, 0], valueLabel: 'Tokyo', value: [0, 1, 0] },
  { label: 'Germany', key: [0.8, 0, 0, 1.0], valueLabel: 'Berlin', value: [0, 0, 1] },
]

type Phase = 'encode-key' | 'encode-value' | 'write' | 'pause' | 'encode-query' | 'read' | 'decode'

interface Step {
  phase: Phase
  country: number
  writesAfter: number
  caption: string
}

const STEPS: Step[] = [
  {
    phase: 'encode-key',
    country: 0,
    writesAfter: 0,
    caption: 'n1 responds to something all three inputs share; n2 responds to France alone.',
  },
  {
    phase: 'encode-value',
    country: 0,
    writesAfter: 0,
    caption: 'Value to store: Paris — the pattern to write back later.',
  },
  {
    phase: 'write',
    country: 0,
    writesAfter: 1,
    caption: 'rho[i][j] += k[i] · v[j] — nudge strengths that already exist, append nothing.',
  },
  {
    phase: 'encode-key',
    country: 1,
    writesAfter: 1,
    caption: 'Japan lights the same shared neuron n1, plus its own n3.',
  },
  { phase: 'encode-value', country: 1, writesAfter: 1, caption: 'Value to store: Tokyo.' },
  {
    phase: 'write',
    country: 1,
    writesAfter: 2,
    caption: 'Same rule, same table. Nothing was resized.',
  },
  {
    phase: 'encode-key',
    country: 2,
    writesAfter: 2,
    caption: 'Germany: n1 again, plus its own n4.',
  },
  { phase: 'encode-value', country: 2, writesAfter: 2, caption: 'Value to store: Berlin.' },
  {
    phase: 'write',
    country: 2,
    writesAfter: 3,
    caption: 'Three associations, one write rule, one fixed table.',
  },
  {
    phase: 'pause',
    country: 0,
    writesAfter: 3,
    caption: 'Three associations stored. The table never changed size.',
  },
  {
    phase: 'encode-query',
    country: 0,
    writesAfter: 3,
    caption: 'Query with France again — the same key as the first step.',
  },
  {
    phase: 'read',
    country: 0,
    writesAfter: 3,
    caption: 'Signal flows along the thickened connections. The active rows are summed.',
  },
  { phase: 'decode', country: 0, writesAfter: 3, caption: 'Recall is a mixture, not a lookup.' },
]

const AUTO_MS = 2200
const fmt = (x: number) => x.toFixed(2)
const NX = 30
const NY = [18, 50, 82, 114]
const VX = 190
const VY = [24, 66, 108]

function NeuronPanel({
  rho,
  activeKey,
  activeValue,
  signalKey,
}: {
  rho: number[][]
  activeKey: Vector | null
  activeValue: Vector | null
  signalKey: Vector | null
}) {
  return (
    <div className="rounded-[4px] border border-line bg-panel/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Neurons and synapses
        </h4>
        <Tag variant="live" />
      </div>
      <svg viewBox="0 0 220 132" className="mt-3 h-[190px] w-full">
        {rho.map((row, i) =>
          row.map((strength, j) => {
            const carrying = signalKey !== null && (signalKey[i] ?? 0) !== 0
            return (
              <line
                key={`${i}-${j}`}
                x1={NX}
                y1={NY[i]}
                x2={VX}
                y2={VY[j]}
                strokeWidth={1 + Math.min(strength, 1) * 6}
                stroke={carrying ? '#2C5FE8' : '#8AA6F1'}
                opacity={carrying ? 0.9 : 0.2 + Math.min(strength, 1) * 0.65}
              />
            )
          }),
        )}
        {NY.map((y, i) => {
          const on = activeKey !== null && (activeKey[i] ?? 0) !== 0
          return (
            <g key={`n${i}`}>
              <circle
                cx={NX}
                cy={y}
                r={on ? 9 : 7}
                fill={on ? '#2C5FE8' : '#FCFCFD'}
                stroke={on ? '#2C5FE8' : '#C9CDD4'}
                strokeWidth={1.5}
              />
              <text x={NX} y={y + 16} textAnchor="middle" className="fill-faint text-[8px]">
                n{i + 1}
              </text>
            </g>
          )
        })}
        {VY.map((y, j) => {
          const on = activeValue !== null && (activeValue[j] ?? 0) !== 0
          return (
            <g key={`v${j}`}>
              <circle
                cx={VX}
                cy={y}
                r={on ? 9 : 7}
                fill={on ? '#16A34A' : '#FCFCFD'}
                stroke={on ? '#16A34A' : '#C9CDD4'}
                strokeWidth={1.5}
              />
              <text x={VX} y={y + 20} textAnchor="middle" className="fill-faint text-[8px]">
                {COUNTRIES[j]?.valueLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function HeatmapPanel({ rho, retrieved }: { rho: number[][]; retrieved: Vector | null }) {
  return (
    <div className="rounded-[4px] border border-line bg-panel/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          The table (rho)
        </h4>
        <Tag variant="live" />
      </div>
      <div className="mt-3 grid grid-cols-[2rem_repeat(3,1fr)] gap-1 font-mono text-[9px] text-faint">
        <span />
        {COUNTRIES.map((c) => (
          <span key={c.valueLabel} className="truncate text-center">
            {c.valueLabel}
          </span>
        ))}
        {rho.map((row, i) => (
          <div key={i} className="contents">
            <span className="flex items-center">n{i + 1}</span>
            {row.map((v, j) => (
              <div
                key={j}
                className="flex aspect-square items-center justify-center rounded-[2px] text-[9px] text-fg"
                style={{ backgroundColor: `rgba(44, 95, 232, ${0.06 + Math.min(v, 1) * 0.75})` }}
              >
                {v !== 0 ? v.toFixed(2) : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {retrieved !== null && (
        <div className="mt-2.5 grid grid-cols-[2rem_repeat(3,1fr)] gap-1 font-mono text-[9px] text-faint">
          <span className="flex items-center">read</span>
          {retrieved.map((v, j) => (
            <span key={j} className="text-center tabular-nums text-accent">
              {fmt(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Page2() {
  const [stepIndex, setStepIndex] = useState(0)
  const [auto, setAuto] = useState(false)
  const [noisy, setNoisy] = useState(false)
  const beamRoot = useRef<HTMLDivElement>(null)
  const fromRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!auto) return
    const id = window.setInterval(() => {
      setStepIndex((s) => (s + 1) % STEPS.length)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [auto])

  const step = STEPS[stepIndex] ?? STEPS[0]!
  const country = COUNTRIES[step.country] ?? COUNTRIES[0]!

  const rho = useMemo(() => {
    const table = zeros(4, 3)
    for (let i = 0; i < step.writesAfter; i++) {
      const c = COUNTRIES[i]
      if (c) write(table, c.key, c.value)
    }
    return table
  }, [step.writesAfter])

  const queryKey = useMemo<Vector>(() => {
    const base = [...country.key]
    if (noisy) base[1] = 0.3
    return base
  }, [country, noisy])

  const isQueryPhase =
    step.phase === 'encode-query' || step.phase === 'read' || step.phase === 'decode'
  const activeKey =
    step.phase === 'encode-key' || step.phase === 'write'
      ? country.key
      : isQueryPhase
        ? queryKey
        : null
  const activeValue = step.phase === 'encode-value' || step.phase === 'write' ? country.value : null

  const retrieved = useMemo(
    () => (isQueryPhase ? read(rho, queryKey) : null),
    [isQueryPhase, rho, queryKey],
  )
  const decodedIndex = useMemo(
    () =>
      retrieved !== null
        ? decodeNearest(
            retrieved,
            COUNTRIES.map((c) => c.value),
          )
        : null,
    [retrieved],
  )

  const contributing = queryKey.map((k, i) => ({ k, i })).filter(({ k }) => k !== 0)

  // Parked, not deleted — flip these back on to restore the frames.
  const showWiringDemo = false
  const showFigure3 = false
  const showQueryFlow = false

  return (
    <div>

      <MechanismIntro />
      {showWiringDemo && (
        <>
      <SplitHeadline
        as="p"
        className="m-0 mb-3 max-w-[820px] text-[26px] font-semibold leading-[1.12] tracking-[-0.022em] text-fg sm:text-[32px]"
      >
        Store it in the wiring.
      </SplitHeadline>
      <p className="mb-6 max-w-[680px] font-serif text-[15px] leading-relaxed text-muted sm:text-base">
        Watch one operation shown two ways at once: as neurons whose connections thicken, and as a
        table whose cells brighten. They are the same numbers.
      </p>
      <FigureNav
        items={[
          { href: '#write-demo', label: 'Write / read demo' },
          { href: '#figure-3', label: 'Figure 3 · Persistent memory' },
          { href: '#query-flow', label: 'Query flow' },
          { href: '#figure-4', label: 'Figure 4 · Structural view' },
        ]}
      />

      <div id="write-demo" style={{ scrollMarginTop: 'var(--header-h)' }}>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setStepIndex((s) => (s + 1) % STEPS.length)}
          className="rounded-[3px] border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg hover:border-accent"
        >
          Next →
        </button>
        <button
          type="button"
          onClick={() => setAuto((a) => !a)}
          aria-pressed={auto}
          className="rounded-[3px] border border-line-strong px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"
        >
          {auto ? '❚❚ Auto' : '▶ Auto'}
        </button>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          step {stepIndex + 1} / {STEPS.length}
        </span>
        {stepIndex >= 10 && (
          <label className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <input type="checkbox" checked={noisy} onChange={(e) => setNoisy(e.target.checked)} />
            Weaken n2 (1.0 → 0.3)
          </label>
        )}
      </div>

      <p className="mt-3 min-h-[2.5em] max-w-prose text-[13px] leading-snug text-fg sm:text-sm">
        {step.caption}
      </p>

      <div ref={beamRoot} className="relative mt-3 grid gap-3 sm:grid-cols-2">
        <div ref={fromRef} className="relative overflow-hidden rounded-[4px]">
          <ShineBorder shineColor="#2C5FE8" duration={16} />
          <NeuronPanel
            rho={rho}
            activeKey={activeKey}
            activeValue={activeValue}
            signalKey={step.phase === 'read' || step.phase === 'decode' ? queryKey : null}
          />
        </div>
        <div ref={toRef} className="relative overflow-hidden rounded-[4px]">
          <ShineBorder shineColor="#16A34A" duration={16} />
          <HeatmapPanel rho={rho} retrieved={retrieved} />
        </div>
        <AnimatedBeam
          containerRef={beamRoot}
          fromRef={fromRef}
          toRef={toRef}
          curvature={18}
          duration={3.2}
          startXOffset={40}
          endXOffset={-40}
        />
      </div>

      {(step.phase === 'read' || step.phase === 'decode') && retrieved !== null && (
        <div className="mt-3 rounded-[4px] border border-line bg-panel/60 p-3 font-mono text-[11px] tabular-nums text-fg">
          {contributing.map(({ k, i }) => {
            const row = rho[i] ?? []
            const scaled = row.map((v) => v * k)
            return (
              <div key={i} className="text-muted">
                {fmt(k)} × [{row.map(fmt).join(', ')}] = [{scaled.map(fmt).join(', ')}]
              </div>
            )
          })}
          <div className="mt-1 border-t border-line-strong pt-1 text-fg">
            sum = [{retrieved.map(fmt).join(', ')}]
          </div>
          {step.phase === 'decode' && decodedIndex !== null && (
            <div className="mt-2 text-live">
              nearest stored value → {COUNTRIES[decodedIndex]?.valueLabel ?? '?'}
              <span className="ml-2 text-faint">
                (others not zero:{' '}
                {COUNTRIES.filter((_, j) => j !== decodedIndex)
                  .map((c) => `${c.valueLabel}=${fmt(retrieved[COUNTRIES.indexOf(c)] ?? 0)}`)
                  .join(', ')}
                )
              </span>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 max-w-prose border-t border-line pt-4 font-serif text-xs leading-relaxed text-muted">
        The table never sees the word “France”. It sees a pattern of active neurons. The meaning
        lives in whatever produced that pattern, not in the table itself.
      </p>
      </div>
        </>
      )}

      {showFigure3 && (
      <div
        id="figure-3"
        className="mt-16 border-t border-line pt-12"
        style={{ scrollMarginTop: 'var(--header-h)' }}
      >
        <Figure3Page />
      </div>
      )}
      {showQueryFlow && (
      <div
        id="query-flow"
        className="mt-16 border-t border-line pt-12"
        style={{ scrollMarginTop: 'var(--header-h)' }}
      >
        <QueryFlowPage />
      </div>
      )}
      <MemoryFlow />
      <div
        id="figure-4"
        className="mt-4 border-t border-line pt-12"
        style={{ scrollMarginTop: 'var(--header-h)' }}
      >
        <Page4 />
      </div>
    </div>
  )
}
