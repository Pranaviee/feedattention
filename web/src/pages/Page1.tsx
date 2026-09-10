import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { Kicker } from '@/components/FigureChrome'
import QuestionCard from '@/components/QuestionCard'
import SplitHeadline from '@/components/SplitHeadline'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShineBorder } from '@/components/ui/shine-border'
import { mix, sev } from '@/design/color'
import { prefersReducedMotion } from '@/lib/reduced-motion'

const CAP = 20480
const STEP = 240
const TICK_MS = 45
const RESET_DELAY_MS = 2600
const WEIGHTS_GB = 14
const BUDGET_GB = 24

type Phase = 'fill' | 'blast' | 'after'

const MESSAGES = [
  ['user', 'Walk me through how attention caches work.', 412],
  ['model', 'Each layer stores a key and a value per token. Nothing is discarded between turns.', 1104],
  ['user', 'And if the conversation keeps going?', 268],
  ['model', 'The cache keeps growing. Linearly, forever, until the allocator fails.', 986],
  ['user', 'Show me where it breaks.', 214],
] as const

function kvGB(tk: number) {
  return (tk * 0.5) / 1024
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

function useOverload() {
  const [tokens, setTokens] = useState(0)
  const [phase, setPhase] = useState<Phase>('fill')
  const iv = useRef<number | null>(null)
  const to = useRef<number | null>(null)

  const stop = () => {
    if (iv.current !== null) window.clearInterval(iv.current)
    if (to.current !== null) window.clearTimeout(to.current)
    iv.current = null
    to.current = null
  }

  useEffect(() => () => stop(), [])

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
    setPhase('fill')
  }

  const setManual = (v: number) => {
    stop()
    setTokens(v)
    setPhase(v >= CAP ? 'blast' : 'fill')
  }

  return { tokens, phase, run, reset, setManual }
}

function Tank({
  label,
  value,
  sub,
  frac,
  p,
  cracked,
  compact,
}: {
  label: string
  value: string
  sub: string
  frac: number
  p: number
  cracked: boolean
  compact?: boolean
}) {
  const c = sev(p)
  const pct = `${(Math.max(0, Math.min(1, frac)) * 100).toFixed(2)}%`
  const h = compact ? 150 : 210
  const w = compact ? 46 : 64
  const critical = p >= 0.9

  return (
    <div className="flex w-[132px] flex-col items-center gap-2.5">
      <div
        className="h-[22px] text-center text-[9.5px] font-semibold tracking-[0.1em] text-faint"
        style={cracked ? { color: '#DC2626' } : undefined}
      >
        {label}
      </div>
      <div
        className="relative overflow-hidden rounded-md"
        style={{
          width: w,
          height: h,
          border: `1.5px solid ${cracked ? '#DC2626' : '#C9CDD4'}`,
          background: '#F6F7F9',
          boxShadow: 'inset 0 1px 2px rgba(22,24,29,.06)',
        }}
      >
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: pct,
            background: c,
            boxShadow: `inset 0 -26px 34px -18px ${mix(c, '#16181D', 0.45)}`,
            transition: 'height .14s linear',
          }}
        />
        <div className="absolute inset-x-0 h-px bg-[#16181D33]" style={{ bottom: pct }} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(180deg,#C9CDD433 0 1px,transparent 1px 20px)',
          }}
        />
        <svg
          viewBox="0 0 64 210"
          className="absolute inset-0 h-full w-full"
          style={{
            opacity: cracked ? (p >= 0.98 ? 0.95 : 0.5) : 0,
            transition: 'opacity .3s',
          }}
        >
          <path d="M32 4 L26 52 L38 88 L22 132 L34 176 L28 206" fill="none" stroke="#FCFCFD" strokeWidth="1.6" />
          <path d="M26 52 L6 66" fill="none" stroke="#FCFCFD" strokeWidth="1.2" />
          <path d="M38 88 L60 100" fill="none" stroke="#FCFCFD" strokeWidth="1.2" />
          <path d="M22 132 L2 148" fill="none" stroke="#FCFCFD" strokeWidth="1.2" />
          <path d="M34 176 L62 186" fill="none" stroke="#FCFCFD" strokeWidth="1.2" />
        </svg>
      </div>
      <div
        className="font-mono text-[14px] font-medium leading-none"
        style={{ color: critical ? '#DC2626' : '#16181D' }}
      >
        {value}
      </div>
      <div className="text-center font-mono text-[10px] leading-snug text-faint">{sub}</div>
    </div>
  )
}

function FlashOverlay({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !ref.current) return
    if (prefersReducedMotion()) {
      ref.current.style.opacity = '0'
      return
    }
    const anim = animate(ref.current, {
      opacity: [0.85, 0],
      duration: 500,
      ease: 'out(2)',
    })
    return () => {
      anim.revert()
    }
  }, [active])

  if (!active) return null
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[1] bg-danger" />
  )
}

function Particles() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return
    const shards = root.current.querySelectorAll<HTMLElement>('[data-shard]')
    const anim = animate(shards, {
      translateY: -120,
      scale: [1, 0.25],
      opacity: [1, 0],
      duration: 720,
      delay: stagger(36),
      ease: 'out(2)',
    })
    return () => {
      anim.revert()
    }
  }, [])

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (360 / 16) * i + (i % 2 ? 11 : 0)
        const s = i % 3 === 0 ? 6 : 4
        const col = i % 2 ? '#FCFCFD' : '#DC2626'
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 h-0 w-0"
            style={{ transform: `rotate(${a}deg)` }}
          >
            <div
              data-shard=""
              style={{
                width: s,
                height: s,
                marginLeft: -s / 2,
                borderRadius: i % 4 ? '50%' : 1,
                background: col,
                boxShadow: `0 0 6px ${i % 2 ? '#FCFCFD' : '#DC262699'}`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function BlastTanks() {
  const row = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion() || !row.current) return
    const tanks = row.current.querySelectorAll<HTMLElement>('[data-blast-tank]')
    const anim = animate(tanks, {
      translateX: [0, -3, 3, -2, 2, 0],
      translateY: [0, 2, -2, -2, 2, 0],
      duration: 420,
      loop: 2,
      ease: 'inOut(2)',
    })
    return () => {
      anim.revert()
    }
  }, [])

  return (
    <div ref={row} className="relative z-[3] flex items-end justify-around gap-4 px-1 pt-[26px]">
      {[
        { label: 'CONTEXT LENGTH', value: '20,480 tok', sub: 'limit reached' },
        { label: 'KV CACHE', value: '10.00 GB', sub: 'alloc failed' },
        { label: 'MEMORY USED', value: '24.00 GB', sub: 'budget exhausted' },
      ].map((t) => (
        <div key={t.label} data-blast-tank="" className="flex w-[132px] flex-col items-center gap-2.5">
          <div className="h-[22px] text-center text-[9.5px] font-semibold tracking-[0.1em] text-danger">
            {t.label}
          </div>
          <div className="relative h-[210px] w-16 overflow-visible rounded-md border-[1.5px] border-danger bg-danger">
            <svg viewBox="0 0 64 210" className="absolute inset-0 h-full w-full">
              <path d="M32 0 L24 48 L40 92 L20 138 L36 182 L26 210" fill="none" stroke="#FCFCFD" strokeWidth="2" />
              <path d="M24 48 L0 60" fill="none" stroke="#FCFCFD" strokeWidth="1.5" />
              <path d="M40 92 L64 104" fill="none" stroke="#FCFCFD" strokeWidth="1.5" />
              <path d="M20 138 L0 156" fill="none" stroke="#FCFCFD" strokeWidth="1.5" />
              <path d="M36 182 L64 192" fill="none" stroke="#FCFCFD" strokeWidth="1.5" />
            </svg>
            <Particles />
          </div>
          <div className="font-mono text-[13px] font-bold leading-none text-danger">{t.value}</div>
          <div className="text-center font-mono text-[10px] leading-snug text-danger">{t.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function Page1() {
  const { tokens, phase, run, reset, setManual } = useOverload()
  const p = Math.max(0, Math.min(1, tokens / CAP))
  const kv = kvGB(tokens)
  const cracked = p >= 0.95
  const status =
    phase === 'blast' ? 'FAILED' : phase === 'after' ? 'RESET' : p >= 0.9 ? 'CRITICAL' : p >= 0.55 ? 'DEGRADED' : p > 0 ? 'NOMINAL' : 'IDLE'
  const statusColor =
    phase === 'blast' ? '#DC2626' : phase === 'after' ? '#8B919C' : p >= 0.9 ? '#DC2626' : p > 0 ? sev(p) : '#8B919C'
  const tanks = [
    { label: 'CONTEXT LENGTH', value: `${fmt(tokens)} tok`, sub: '/ 20,480 max', frac: p },
    { label: 'KV CACHE', value: `${kv.toFixed(2)} GB`, sub: '0.50 MB / token', frac: p },
    {
      label: 'MEMORY USED',
      value: `${(WEIGHTS_GB + kv).toFixed(2)} GB`,
      sub: '/ 24.00 GB · 14.00 weights',
      frac: (WEIGHTS_GB + kv) / BUDGET_GB,
    },
  ]

  return (
    <div>
      <h2 id="problem-heading" className="sr-only">The Problem</h2>
      <Kicker label="§ 1 — THE PROBLEM" tags={['cited']} />
      <SplitHeadline
        as="p"
        className="m-0 mb-3.5 max-w-[820px] font-display text-[26px] font-semibold leading-[1.12] tracking-[-0.01em] text-fg sm:text-[40px]"
      >
        Every token you remember has to live somewhere.
      </SplitHeadline>
      <div className="mb-8 flex max-w-[680px] flex-col gap-3.5 font-reading text-[15px] leading-relaxed text-muted sm:text-[17px]">
        <p className="m-0">
          A Transformer keeps a <span className="font-semibold text-fg">key</span> and{' '}
          <span className="font-semibold text-fg">value</span> for every token, in every layer. As
          the conversation grows, so does the KV cache —{' '}
          <span className="font-semibold text-fg">linearly</span>.
        </p>
        <p className="m-0">More conversation → more cached tokens → more memory.</p>
        <p className="m-0">
          Eventually, the cache hits the device limit, which is why Transformers have{' '}
          <span className="font-semibold text-fg">finite context windows</span>: they can’t keep
          unlimited history, so their usable memory is effectively{' '}
          <span className="font-semibold text-fg">short-term</span>.
        </p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-9">
        <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-line bg-panel2 p-4 sm:p-5">
          <ShineBorder shineColor={['#2C5FE8', '#16A34A']} duration={12} />
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-faint">
              CONVERSATION FEED
            </span>
            <span className="font-mono text-[11px] font-medium text-muted">
              turn {Math.min(5, Math.floor(p * 5) + 1)} / 5
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {MESSAGES.map((m, i) => {
              const user = m[0] === 'user'
              const live = p > (i + 1) / (MESSAGES.length + 1)
              return (
                <div
                  key={i}
                  className={`flex ${user ? 'justify-end' : 'justify-start'}`}
                  style={{ opacity: live ? 1 : 0.35, transition: 'opacity .3s' }}
                >
                  <div
                    className="max-w-[78%] rounded-lg px-3 py-2.5 font-serif text-[13.5px] leading-normal text-fg"
                    style={{
                      background: user ? '#E8EEFD' : '#FFFFFF',
                      border: `1px solid ${user ? '#B4C8F5' : '#E3E5E9'}`,
                    }}
                  >
                    {m[1]}
                    <span
                      className="mt-1.5 block font-mono text-[9.5px] leading-none"
                      style={{ color: user ? '#1E4FC4' : '#8B919C' }}
                    >
                      +{m[2]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5 border-t border-line pt-3.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-faint">
                TOKENS EMITTED
              </span>
              <span
                className="font-mono text-[22px] font-bold tabular-nums leading-none"
                style={{ color: p >= 0.9 ? '#DC2626' : '#16181D' }}
              >
                {fmt(tokens)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={CAP}
              step={16}
              value={tokens}
              onChange={(e) => setManual(Number(e.target.value))}
              aria-label="Tokens emitted"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={run}
                className="flex-1 rounded-md border border-accent bg-panel px-3 py-2 text-[12px] font-semibold text-accent hover:bg-[#E8EEFD]"
              >
                Run to overload
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-line-strong bg-panel px-3 py-2 text-[12px] font-medium text-muted hover:border-faint hover:text-fg"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div
          className="relative flex flex-col overflow-hidden rounded-lg bg-panel p-5"
          style={{ border: `1px solid ${phase === 'blast' ? '#DC2626' : '#E3E5E9'}` }}
        >
          <FlashOverlay active={phase === 'blast'} />
          <div className="relative z-[2] mb-1 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-faint">
              MEMORY STATE
            </span>
            <span
              className="font-mono text-[10.5px] font-bold tracking-[0.1em]"
              style={{ color: statusColor }}
            >
              {status}
            </span>
          </div>

          {phase === 'fill' && (
            <div className="relative z-[2] flex items-end justify-around gap-4 px-1 pt-[22px]">
              {tanks.map((t) => (
                <Tank key={t.label} {...t} p={p} cracked={cracked} />
              ))}
            </div>
          )}

          {phase === 'blast' && <BlastTanks />}

          {phase === 'blast' && (
            <div className="relative z-[4] mt-5 text-center">
              <div className="inline-block rounded bg-danger px-4 py-2 font-mono text-[15px] font-bold tracking-[0.1em] text-panel">
                OUT OF MEMORY
              </div>
              <div className="mt-2.5 font-mono text-[11.5px] leading-normal text-danger">
                CUDA error: allocation of 512.00 MiB failed · 24.00 / 24.00 GB
              </div>
            </div>
          )}

          {phase === 'after' && (
            <BlurFade offset={10}>
              <div className="relative z-[2] flex items-end justify-around gap-4 px-1 pt-[22px]">
                {[
                  { label: 'CONTEXT LENGTH', value: '0 tok', sub: 'released' },
                  { label: 'KV CACHE', value: '0.00 GB', sub: 'released' },
                  { label: 'MEMORY USED', value: '0.00 GB', sub: 'released' },
                ].map((t) => (
                  <div key={t.label} className="flex w-[132px] flex-col items-center gap-2.5">
                    <div className="h-[22px] text-center text-[9.5px] font-semibold tracking-[0.1em] text-faint">
                      {t.label}
                    </div>
                    <div className="h-[210px] w-16 rounded-md border-[1.5px] border-dashed border-line-strong bg-transparent" />
                    <div className="font-mono text-[13px] font-medium leading-none text-faint">{t.value}</div>
                    <div className="text-center font-mono text-[10px] leading-snug text-faint">{t.sub}</div>
                  </div>
                ))}
              </div>
              <div className="relative z-[2] mt-6 border-t border-line pt-5">
                <p className="mb-0 max-w-[440px] font-serif text-[17px] leading-relaxed text-fg">
                  This is the cost of never forgetting. What if the memory simply couldn’t grow in
                  the first place?
                </p>
              </div>
            </BlurFade>
          )}

          <div className="relative z-[2] mt-[22px] flex items-start gap-2 border-t border-line pt-3.5">
            <span className="mt-px shrink-0 font-mono text-[9.5px] font-bold leading-snug text-faint">i</span>
            <p className="m-0 max-w-[460px] text-[11px] leading-normal text-faint">
              Illustrative, based on a representative 7B-parameter transformer configuration (32
              layers, 4096 hidden size, fp16 KV cache) and an assumed 24GB budget.
            </p>
          </div>
        </div>
      </div>


      {/* Deliberate breathing room: on first load only the intro + tank
          card should be visible. The question is a beat you scroll or
          click to, not something that bleeds into view immediately. */}
      <div className="h-[35vh] min-h-24" aria-hidden="true" />

      <QuestionCard id="problem-question">
        Can we give a model a memory that stays the same size — even as the conversation keeps
        growing?
      </QuestionCard>

      {/* Same reasoning as the spacer above: without room here, both cards
          sit inside the viewport at once and their reveals fire together. */}
      <div className="h-[35vh] min-h-24" aria-hidden="true" />

      <QuestionCard id="problem-claim" kicker="Our claim">
        <p className="m-0 font-display text-[34px] font-bold leading-none text-accent sm:text-[40px]">
          Yes.
        </p>
        <p className="m-0 mt-4 font-reading text-[16px] font-normal leading-relaxed text-fg sm:text-[17px]">
          A fixed-size synaptic memory can absorb unlimited associations without ever growing —
          but recall degrades as the table fills, and collapses much earlier when cues overlap.
        </p>
        <p className="m-0 mt-5 font-mono text-[11.5px] uppercase tracking-[0.08em] text-muted">
          One fixed memory. Unlimited writes. A predictable price: interference.
        </p>
      </QuestionCard>

      <div className="h-[30vh] min-h-20" aria-hidden="true" />
    </div>
  )
}
