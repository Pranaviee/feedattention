import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import FootprintTable from '@/components/FootprintTable'
import Tag from '@/components/Tag'

const CAP = 20480
const STEP = 240
const TICK_MS = 45
const RESET_DELAY_MS = 2600
const TANKS = ['CTX', 'KV', 'MEM'] as const

/** 5-stop severity ramp, linearly interpolated in RGB — ported from the
 * imported design's `sev(p)` exactly (stop positions and hex values). */
const STOPS: Array<[number, string]> = [
  [0, '#3FB37A'],
  [0.3, '#3FB37A'],
  [0.55, '#F4A93B'],
  [0.8, '#E8853B'],
  [0.98, '#F0605A'],
  [1, '#F0605A'],
]
function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
function severityColor(p: number): string {
  const clamped = Math.min(1, Math.max(0, p))
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [p0, c0] = STOPS[i] ?? [0, '#3FB37A']
    const [p1, c1] = STOPS[i + 1] ?? [1, '#F0605A']
    if (clamped >= p0 && clamped <= p1) {
      const t = p1 === p0 ? 0 : (clamped - p0) / (p1 - p0)
      const [r0, g0, b0] = hexToRgb(c0)
      const [r1, g1, b1] = hexToRgb(c1)
      const r = Math.round(r0 + (r1 - r0) * t)
      const g = Math.round(g0 + (g1 - g0) * t)
      const b = Math.round(b0 + (b1 - b0) * t)
      return `rgb(${r},${g},${b})`
    }
  }
  return '#F0605A'
}

type Phase = 'idle' | 'fill' | 'blast' | 'after'

/** The fill/blast/reset timing, ported exactly from the imported design's
 * `run()`: +240 tokens every 45ms, blast at cap, reset 2600ms later. */
function useOverload() {
  const [tokens, setTokens] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const iv = useRef<number | null>(null)
  const to = useRef<number | null>(null)

  const stop = () => {
    if (iv.current !== null) window.clearInterval(iv.current)
    if (to.current !== null) window.clearTimeout(to.current)
    iv.current = null
    to.current = null
  }

  const run = () => {
    stop()
    setTokens(0)
    setPhase('fill')
    iv.current = window.setInterval(() => {
      setTokens((t) => {
        const next = t + STEP
        if (next >= CAP) {
          if (iv.current !== null) window.clearInterval(iv.current)
          setPhase('blast')
          to.current = window.setTimeout(() => {
            setPhase('after')
            setTokens(0)
          }, RESET_DELAY_MS)
          return CAP
        }
        return next
      })
    }, TICK_MS)
  }

  const reset = () => {
    stop()
    setTokens(0)
    setPhase('idle')
  }

  useEffect(() => stop, [])
  return { tokens, phase, run, reset }
}

function Tank({ pct, phase, label }: { pct: number; phase: Phase; label: string }) {
  const color = severityColor(pct)
  const shattered = phase === 'blast' || phase === 'after'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={
          'relative h-40 w-14 overflow-hidden rounded-[3px] border sm:h-52 sm:w-16 ' +
          (phase === 'after' || phase === 'idle'
            ? 'border-dashed border-line-strong'
            : 'border-line-strong')
        }
      >
        {!shattered && (
          <motion.div
            className="absolute inset-x-0 bottom-0"
            style={{ background: color }}
            animate={{ height: `${pct * 100}%` }}
            transition={{ duration: 0.14, ease: 'linear' }}
          />
        )}
        <AnimatePresence>
          {phase === 'blast' && (
            <>
              {Array.from({ length: 16 }, (_, i) => {
                const angle = ((360 / 16) * i * Math.PI) / 180
                const dist = 60 + (i % 3) * 18
                return (
                  <motion.span
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist - 20,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    transition={{ duration: 0.7 + (i % 3) * 0.09, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-[1px]"
                    style={{ background: i % 2 === 0 ? '#F0605A' : '#fff' }}
                  />
                )
              })}
            </>
          )}
        </AnimatePresence>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
    </div>
  )
}

export default function OverloadPage() {
  const { tokens, phase, run, reset } = useOverload()
  const pct = tokens / CAP

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-2">
        <p className="max-w-prose text-[13px] leading-relaxed text-muted sm:text-sm">
          A transformer keeps one key and one value vector per token, per layer, for the whole
          conversation. Nothing is ever discarded. The cache grows linearly with the dialogue, and
          the moment it crosses the device budget the model stops — not because it forgot, but
          because it refused to.
        </p>
        <Tag variant="live" />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={phase === 'fill' || phase === 'blast'}
          className="rounded-[3px] border border-line-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg hover:border-accent disabled:opacity-40"
        >
          Run to overload
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-[3px] border border-line-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-fg"
        >
          Reset
        </button>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          {tokens.toLocaleString()} / {CAP.toLocaleString()} tokens
        </span>
      </div>

      <div className="mt-5 rounded-[4px] border border-line bg-panel/60 p-4 sm:p-6">
        <div className="flex items-center justify-around gap-6">
          {TANKS.map((t) => (
            <Tank key={t} pct={pct} phase={phase} label={t} />
          ))}
        </div>

        <div className="mt-5 min-h-[2.5rem] text-center">
          <AnimatePresence mode="wait">
            {phase === 'after' ? (
              <motion.div
                key="after"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-[13px] text-fg">
                  This is the cost of never forgetting. What if the memory simply couldn’t grow in
                  the first place?
                </p>
                <a
                  href="#mechanism"
                  className="mt-2 inline-block font-mono text-[11px] text-accent hover:underline"
                >
                  Continue to the mechanism →
                </a>
              </motion.div>
            ) : (
              <motion.p
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[11px] text-faint"
              >
                {phase === 'idle' && 'Idle. Outlines only, neutral border.'}
                {phase === 'fill' && pct < 0.55 && 'Healthy. Comfortable headroom.'}
                {phase === 'fill' &&
                  pct >= 0.55 &&
                  pct < 0.8 &&
                  'The cache is now the largest single allocation.'}
                {phase === 'fill' && pct >= 0.8 && pct < 0.98 && 'Batch size drops; latency climbs.'}
                {phase === 'fill' && pct >= 0.98 && 'Hairline cracks. One more turn is fatal.'}
                {phase === 'blast' && 'All three shatter at once.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
        Illustrative, based on a representative 7B-parameter transformer configuration (32 layers,
        4096 hidden size, fp16 KV cache) and an assumed device budget.
      </p>

      <div className="mt-6">
        <FootprintTable />
      </div>
    </div>
  )
}
