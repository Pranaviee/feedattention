import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import { AnimatePresence, motion } from 'motion/react'
import { ShineBorder } from '@/components/ui/shine-border'
import { DIMS, HUES, mix, WORDS } from '@/design/color'
import {
  BRAIN_COORDS,
  BRAIN_FOLDS,
  BRAIN_PATH,
  EDGE_SPECS,
  EMBEDDINGS,
  FRANCE_READOUT,
  NEURON_DEFS,
  TEXTURE,
  borderOf,
  fillOf,
  type NeuronDef,
} from '@/design/eleven'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

export type TagKind = 'SETUP' | 'ILLUSTRATION' | 'LIVE'
export type FlowMode = 'write' | 'read' | 'fire' | null

export interface FlowFrame {
  n: number
  title: string
  tag: TagKind
  cur: number
  done: number[]
  fill: number[]
  act: string[]
  mode: FlowMode
  cap: string
  emb?: string
  arrow?: boolean
  alsoFrance?: boolean
  note?: string
  query?: boolean
  readout?: boolean
  decode?: boolean
}

export const FLOW_TAG: Record<TagKind, { t: string; b: string; br: string }> = {
  SETUP: { t: '#5C6370', b: '#F0F1F3', br: '#D5D8DE' },
  ILLUSTRATION: { t: '#B36400', b: '#FFF8EE', br: '#F0C48A' },
  LIVE: { t: '#067A4E', b: '#E6F6EF', br: '#A8E0C8' },
}

export function brainDefs(): NeuronDef[] {
  return NEURON_DEFS.map((d) => {
    const c = BRAIN_COORDS[d.id]
    if (!c) return d
    return { ...d, x: c[0], y: c[1], r: c[2] }
  })
}

const ART_W = 780
const ART_H = 540
const PAD_X = 36
const PAD_Y = 32
const BRAIN_W = ART_W + PAD_X * 2
const BRAIN_H = ART_H + PAD_Y * 2

function BrainPane({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      setScale(w > 0 ? w / BRAIN_W : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="min-w-0 w-full">
      <div
        className="relative overflow-hidden rounded-md border border-line bg-panel2"
        data-brain-pane=""
        style={{
          aspectRatio: `${BRAIN_W} / ${BRAIN_H}`,
          height: scale > 0 ? BRAIN_H * scale : undefined,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: BRAIN_W,
            height: BRAIN_H,
            transform: scale > 0 ? `scale(${scale})` : undefined,
          }}
        >
          <div
            className="absolute"
            style={{ left: PAD_X, top: PAD_Y, width: ART_W, height: ART_H }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

const pop = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
}

function FadePop({
  reduced,
  className,
  children,
}: {
  reduced: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div
      className="overflow-hidden"
      initial={reduced ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={reduced ? undefined : { height: 0, opacity: 0 }}
      transition={
        reduced
          ? { duration: 0 }
          : {
              height: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
            }
      }
    >
      <div className={className}>{children}</div>
    </motion.div>
  )
}

export default function QueryFlowBoard({ frame: f }: { frame: FlowFrame }) {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const prevActRef = useRef<string[]>([])
  const defs = useMemo(brainDefs, [])
  const byId = useMemo(() => Object.fromEntries(defs.map((d) => [d.id, d])), [defs])
  const T = FLOW_TAG[f.tag]
  const order = [...f.act].sort((a, b) => {
    const va = byId[a]?.vals[Math.max(0, f.cur)] ?? 0
    const vb = byId[b]?.vals[Math.max(0, f.cur)] ?? 0
    return va - vb
  })
  const bars = f.emb ? (EMBEDDINGS[f.emb] ?? []) : []
  const actKey = f.act.join(',')
  const cellEase = reduced ? 'none' : 'background-color 0.28s ease, color 0.28s ease, box-shadow 0.28s ease'

  const arrows =
    f.mode === 'write' || f.mode === 'read'
      ? f.act.map((id) => {
          const d = byId[id]
          const read = f.mode === 'read'
          return {
            id,
            color: read ? '#16A34A' : (d?.hue ?? '#2C5FE8'),
            d: read ? 'M34 6 H12' : 'M2 6 H26',
            head: read ? 'M18 1.5 L11 6 L18 10.5' : 'M26 1.5 L34 6 L26 10.5 Z',
            headFill: read ? 'none' : (d?.hue ?? '#2C5FE8'),
          }
        })
      : []

  useEffect(() => {
    const prev = prevActRef.current
    prevActRef.current = f.act
    if (reduced || !rootRef.current || f.act.length === 0) return
    const root = rootRef.current
    const fireOrder = [...f.act].sort((a, b) => {
      const va = byId[a]?.vals[Math.max(0, f.cur)] ?? 0
      const vb = byId[b]?.vals[Math.max(0, f.cur)] ?? 0
      return va - vb
    })
    const ids = f.mode === 'fire' ? fireOrder : f.act.filter((id) => !prev.includes(id))
    const nodes = ids.flatMap((id) => [...root.querySelectorAll<HTMLElement>(`[data-neuron="${id}"]`)])
    if (nodes.length === 0) return
    const anim = animate(nodes, {
      scale: f.mode === 'fire' ? [0.78, 1.1, 1] : [0.96, 1.05, 1],
      duration: f.mode === 'fire' ? 420 : 280,
      delay: stagger(f.mode === 'fire' ? 55 : 40),
      ease: 'out(2)',
    })
    return () => {
      anim.pause()
    }
  }, [actKey, byId, f.act, f.cur, f.mode, reduced])

  useEffect(() => {
    if (reduced || f.mode !== 'write' || !rootRef.current) return
    const cells = rootRef.current.querySelectorAll<HTMLElement>('[data-just-wrote="1"]')
    if (cells.length === 0) return
    const anim = animate(cells, {
      scale: [1, 1.16, 1],
      duration: 320,
      delay: stagger(35),
      ease: 'out(2)',
    })
    return () => {
      anim.pause()
    }
  }, [f.n, f.mode, f.cur, reduced])

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-lg border border-line-strong bg-panel p-3 sm:p-4"
    >
      <ShineBorder shineColor={f.tag === 'LIVE' ? '#16A34A' : '#2C5FE8'} duration={14} />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="rounded bg-fg px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-panel">
          FRAME {f.n}
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-fg">{f.title}</span>
        <span className="h-px flex-1 fade-rule" />
        <span
          className="font-mono text-[9.5px] font-semibold tracking-[0.06em]"
          style={{
            color: f.mode === 'read' ? '#16A34A' : f.mode === 'write' ? '#2C5FE8' : '#8B919C',
          }}
        >
          {f.mode === 'write'
            ? 'WRITE · inward'
            : f.mode === 'read'
              ? 'READ · outward'
              : f.mode === 'fire'
                ? 'FIRE · no write yet'
                : 'IDLE'}
        </span>
        <span
          className="rounded px-2 py-[3px] font-mono text-[9.5px] font-semibold tracking-[0.06em]"
          style={{ color: T.t, background: T.b, border: `1px solid ${T.br}` }}
        >
          {f.tag}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel2 px-3 py-2">
        <span className="shrink-0 font-mono text-[9.5px] font-semibold tracking-[0.1em] text-faint">
          INPUT
        </span>
        <span className="h-4 w-px shrink-0 bg-line" />
        {WORDS.map((w, i) => {
          const cur = i === f.cur
          const past = f.done.includes(i)
          const q = cur && Boolean(f.query)
          return (
            <motion.span
              key={w}
              className="relative whitespace-nowrap rounded-md px-2.5 py-1 text-[12px]"
              animate={{
                scale: cur && !reduced ? 1.03 : 1,
                opacity: cur || past ? 1 : 0.55,
              }}
              transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontWeight: cur ? 700 : 500,
                background: q ? '#E6F6EF' : cur ? '#E8EEFD' : past ? '#F0F1F3' : 'transparent',
                border: `1px solid ${q ? '#16A34A' : cur ? '#2C5FE8' : '#E3E5E9'}`,
                color: q ? '#067A4E' : cur ? '#1E4FC4' : past ? '#8B919C' : '#C9CDD4',
              }}
            >
              {w}
              <AnimatePresence initial={false}>
                {(q || cur) && (
                  <motion.span
                    key={q ? 'QUERY' : 'NOW'}
                    className="ml-1.5 font-mono text-[8.5px] font-bold tracking-[0.08em]"
                    style={{ color: q ? '#067A4E' : '#2C5FE8' }}
                    initial={reduced ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? undefined : { opacity: 0, x: 6 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.22 }}
                  >
                    {q ? 'QUERY' : 'NOW'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.span>
          )
        })}
      </div>

      <div>
        <AnimatePresence initial={false}>
          {f.emb && (
            <FadePop
              key="emb"
              reduced={reduced}
              className="mb-3 flex min-w-0 flex-wrap items-center gap-3 rounded-md border border-[#F0C48A] bg-[#FFF8EE] px-3 py-2"
            >
              <div className="shrink-0">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-warn-ink">
                    EMBEDDING · 8d
                  </span>
                  <span className="relative inline-block min-w-[4.5em] font-mono text-[9.5px] font-medium text-warn-ink">
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={f.emb}
                        className="absolute left-0 top-0"
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? undefined : { opacity: 0, y: -4 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.18 }}
                      >
                        {f.emb}
                      </motion.span>
                    </AnimatePresence>
                    <span className="invisible">{f.emb}</span>
                  </span>
                </div>
                <div className="flex h-9 items-end gap-[4px]">
                  {bars.map((v, i) => (
                    <motion.div
                      key={i}
                      className="w-2.5 rounded-t-sm"
                      initial={reduced ? false : { height: 0 }}
                      animate={{ height: 6 + v * 30 }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : { duration: 0.28, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }
                      }
                      style={{
                        background: mix('#E8850C', '#FFFFFF', 0.15 + (1 - v) * 0.4),
                      }}
                    />
                  ))}
                </div>
                <div className="mt-0.5 flex gap-[4px]">
                  {bars.map((v, i) => (
                    <span key={i} className="w-2.5 text-center font-mono text-[6.5px] text-warn-ink">
                      {v.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
              <AnimatePresence initial={false}>
                {f.arrow && (
                  <motion.div
                    key="encoder"
                    className="flex min-w-0 flex-1 items-center gap-2"
                    initial={reduced ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduced ? undefined : { opacity: 0, x: 12 }}
                    transition={reduced ? { duration: 0 } : pop}
                  >
                    <svg viewBox="0 0 72 18" className="h-[18px] w-[72px] shrink-0">
                      <path
                        d="M4 9 H56"
                        stroke="#8B919C"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                        fill="none"
                      />
                      <path d="M56 4 L68 9 L56 14" stroke="#8B919C" strokeWidth="1.5" fill="none" />
                    </svg>
                    <span className="font-serif text-[11px] leading-snug text-muted">
                      a trained encoder would map this to the firing pattern below.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </FadePop>
          )}
          {f.note && (
            <FadePop
              key="note"
              reduced={reduced}
              className="mb-3 rounded-md border border-[#D5D8DE] bg-[#F0F1F3] px-3 py-2"
            >
              <p className="m-0 font-serif text-[13px] leading-snug text-fg">{f.note}</p>
            </FadePop>
          )}
          {f.decode && (
            <FadePop
              key="decode"
              reduced={reduced}
              className="mb-3 flex shrink-0 items-center gap-2.5 rounded-md border border-line-strong bg-panel px-3 py-2"
            >
              <span className="font-mono text-[9px] font-semibold tracking-[0.08em] text-faint">
                DECODER
              </span>
              <svg viewBox="0 0 88 22" className="h-[22px] w-[88px]">
                <path d="M4 11 H36" stroke="#16A34A" strokeWidth="2" fill="none" />
                <path d="M36 6 L44 11 L36 16" stroke="#16A34A" strokeWidth="2" fill="none" />
                <text x="50" y="15" fontFamily="ui-monospace, monospace" fontSize="9" fill="#5C6370">
                  argmax
                </text>
              </svg>
              <span className="rounded-md border border-live bg-[#E6F6EF] px-2.5 py-1 text-[12px] font-bold text-live-ink">
                Paris
              </span>
              <span className="font-mono text-[10px] font-medium text-live-ink">2.10</span>
            </FadePop>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_18px_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <BrainPane>
            <svg viewBox="0 0 780 540" className="h-[540px] w-[780px]">
              <path d={BRAIN_PATH} fill="#FFFFFF" stroke="#C9CDD4" strokeWidth="2.5" />
              {BRAIN_FOLDS.map((d) => (
                <path key={d} d={d} fill="none" stroke="#E3E5E9" strokeWidth="2" />
              ))}
              {TEXTURE.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#5C6370" opacity={d.o} />
              ))}
              {EDGE_SPECS.map(([a, b, color, w, dash], i) => {
                const A = byId[a]
                const B = byId[b]
                if (!A || !B) return null
                const live = f.act.includes(a) && f.act.includes(b)
                const special = Boolean(f.alsoFrance) && a === 'n9' && b === 'n3'
                return (
                  <line
                    key={i}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke={special ? HUES.QUIRK : color}
                    strokeWidth={special ? 2.5 : live ? w + 2 : w}
                    strokeDasharray={special ? '5 5' : dash}
                    opacity={f.act.length === 0 ? 0.28 : special ? 0.85 : live ? 1 : 0.09}
                    strokeLinecap="round"
                    style={{ transition: reduced ? 'none' : 'opacity 0.28s ease, stroke-width 0.25s ease' }}
                  />
                )
              })}
            </svg>
            <div className="absolute left-[120px] top-[112px] text-[13px] font-semibold tracking-[0.16em] text-accent-deep">
              EUROPE SIDE
            </div>
            <div className="absolute left-[540px] top-[112px] text-[13px] font-semibold tracking-[0.16em] text-[#0B6E66]">
              ASIA SIDE
            </div>
            <div className="absolute left-[334px] top-[452px] text-[13px] font-semibold tracking-[0.16em] text-violet">
              BETWEEN
            </div>
            {defs.map((d) => {
              const on = f.act.includes(d.id)
              const v = f.cur >= 0 && on ? (d.vals[f.cur] ?? 0) : 0
              return (
                <motion.div
                  key={d.id}
                  data-neuron={d.id}
                  data-neuron-on={on ? '1' : '0'}
                  className="absolute origin-center"
                  animate={{
                    opacity: f.act.length === 0 ? 0.42 : on ? 1 : 0.22,
                  }}
                  transition={reduced ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    left: d.x - d.r,
                    top: d.y - d.r,
                    width: d.r * 2,
                    height: d.r * 2,
                    zIndex: on ? 6 : 4,
                  }}
                >
                  <AnimatePresence initial={false}>
                    {on && f.mode === 'fire' && (
                      <motion.div
                        key="ord"
                        className="absolute -left-2 -top-2 z-[8] flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-panel font-mono text-xs font-bold text-fg"
                        initial={reduced ? false : { opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0, scale: 0.6 }}
                        transition={reduced ? { duration: 0 } : { duration: 0.28, delay: order.indexOf(d.id) * 0.08 }}
                      >
                        {order.indexOf(d.id) + 1}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence initial={false}>
                    {on && f.cur >= 0 && v > 0 && (
                      <motion.div
                        key="val"
                        className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[13px] font-bold text-panel"
                        style={{ background: d.hue }}
                        initial={reduced ? false : { opacity: 0, y: 8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.85 }}
                        transition={reduced ? { duration: 0 } : pop}
                      >
                        {v.toFixed(1)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {on && f.mode === 'fire' && !reduced && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${d.hue}` }}
                      initial={{ scale: 1, opacity: 0.65 }}
                      animate={{ scale: 1.55, opacity: 0 }}
                      transition={{ duration: 0.45, delay: order.indexOf(d.id) * 0.05 }}
                    />
                  )}
                  <div
                    className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
                    style={{
                      background: fillOf(d),
                      border: borderOf(d),
                      boxShadow: on
                        ? `0 0 0 ${(3 + v * 7).toFixed(1)}px ${d.hue}33`
                        : '0 1px 2px #16181D1A',
                      transition: reduced ? 'none' : 'box-shadow 0.35s ease',
                    }}
                  >
                    {d.kind === 'quirk' && (
                      <>
                        <div className="absolute bottom-0 left-0 top-0 w-1/2" style={{ background: HUES.EU }} />
                        <div className="absolute bottom-0 right-0 top-0 w-1/2" style={{ background: HUES.AS }} />
                      </>
                    )}
                    <span
                      className="relative z-[2] font-mono font-bold leading-none"
                      style={{
                        fontSize: d.r > 26 ? 14 : 13,
                        color: d.kind === 'region' ? mix(d.hue, '#16181D', 0.45) : '#FFFFFF',
                      }}
                    >
                      {d.id}
                    </span>
                  </div>
                  <div
                    className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[13px] leading-tight"
                    style={{
                      fontWeight: d.kind === 'quirk' ? 700 : 500,
                      color: d.kind === 'quirk' ? HUES.QUIRK : '#5C6370',
                    }}
                  >
                    {d.label}
                  </div>
                </motion.div>
              )
            })}
          </BrainPane>
          <p className="mt-1.5 font-serif text-[10px] leading-snug text-faint">
            Background neurons shown for scale only — not tracked or computed.
          </p>
        </div>

        <div className="hidden h-full flex-col justify-center gap-3 self-stretch pt-8 lg:flex">
          <AnimatePresence initial={false}>
            {arrows.map((a) => (
              <motion.svg
                key={a.id}
                viewBox="0 0 36 12"
                className="h-2.5 w-[18px]"
                initial={reduced ? false : { opacity: 0, x: f.mode === 'read' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2 }}
              >
                <path d={a.d} stroke={a.color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d={a.head} fill={a.headFill} stroke={a.color} strokeWidth="1.5" />
              </motion.svg>
            ))}
          </AnimatePresence>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-md border border-line bg-panel">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr>
                  <th className="w-[28%] border-b border-line-strong bg-panel2 px-1.5 py-1 text-left text-[8.5px] font-semibold tracking-[0.04em] text-muted">
                    NEURON
                  </th>
                  {DIMS.map((c, i) => (
                    <th
                      key={c}
                      className="border-b border-line-strong px-0.5 py-1 text-center text-[8.5px] font-semibold tracking-[0.02em]"
                      style={{
                        color:
                          (f.mode === 'write' || f.mode === 'read') && i === f.cur
                            ? '#16181D'
                            : i < 3
                              ? '#1E4FC4'
                              : '#0B6E66',
                        background:
                          (f.mode === 'write' || f.mode === 'read') && i === f.cur
                            ? f.mode === 'read'
                              ? '#E6F6EF'
                              : '#FFF8EE'
                            : i < 3
                              ? '#E8EEFD'
                              : '#E4F2F0',
                        transition: cellEase,
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defs.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      opacity: f.act.length && !f.act.includes(d.id) ? 0.4 : 1,
                      transition: reduced ? 'none' : 'opacity 0.35s ease',
                    }}
                  >
                    <td className="truncate border-b border-[#F0F1F3] px-1.5 py-0.5">
                      <span className="inline-flex max-w-full items-center gap-1">
                        <span
                          className="inline-block h-1.5 w-1.5 shrink-0 rounded-sm"
                          style={{
                            background: d.kind === 'region' ? mix(d.hue, '#FFFFFF', 0.34) : d.hue,
                            border: `1px solid ${d.kind === 'quirk' ? HUES.QUIRK : mix(d.hue, '#16181D', 0.2)}`,
                          }}
                        />
                        <span className="font-mono text-[9.5px] font-semibold text-fg">{d.id}</span>
                        <span
                          className="truncate text-[9px] font-medium"
                          style={{ color: d.kind === 'quirk' ? HUES.QUIRK : '#8B919C' }}
                        >
                          {d.label}
                        </span>
                      </span>
                    </td>
                    {d.vals.map((v0, i) => {
                      const shown = f.fill.includes(i) ? v0 : 0
                      const justWrote = f.mode === 'write' && i === f.cur && shown > 0
                      return (
                        <td
                          key={i}
                          className="border-b border-[#F0F1F3] px-0.5 py-0.5 text-center font-mono text-[10px] tabular-nums"
                          style={{
                            fontWeight: shown >= 1 ? 700 : 500,
                            background: shown === 0 ? '#FCFCFD' : mix(d.hue, '#FFFFFF', 1 - shown * 0.85),
                            color: shown === 0 ? '#C9CDD4' : shown >= 0.7 ? '#FFFFFF' : '#16181D',
                            boxShadow: justWrote ? 'inset 0 0 0 1.5px #16181D33' : 'none',
                            transition: cellEase,
                          }}
                        >
                          <span
                            data-just-wrote={justWrote ? '1' : undefined}
                            className="inline-block origin-center"
                          >
                            {shown === 0 ? '0' : shown.toFixed(1)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {f.readout && (
                  <tr>
                    <td className="border-t-[1.5px] border-line-strong bg-panel2 px-1.5 py-1 text-[8.5px] font-bold text-fg">
                      READOUT
                    </td>
                    {FRANCE_READOUT.map((v, i) => {
                      const win = i === 0
                      const leak = i === 3
                      return (
                        <td
                          key={i}
                          className="border-t-[1.5px] border-line-strong px-0.5 py-1 text-center font-mono text-[10px] tabular-nums"
                          style={{
                            fontWeight: win ? 700 : 500,
                            background: win ? '#E6F6EF' : leak ? '#FDEAEA' : '#F6F7F9',
                            color: win ? '#067A4E' : leak ? '#DC2626' : '#5C6370',
                          }}
                        >
                          {v.toFixed(2)}
                          <div className="mx-auto mt-0.5 h-1 max-w-[36px] rounded-sm bg-line">
                            <motion.div
                              className="h-1 rounded-sm"
                              initial={reduced ? false : { width: 0 }}
                              animate={{ width: `${(v / 2.1) * 100}%` }}
                              transition={
                                reduced
                                  ? { duration: 0 }
                                  : { duration: 0.55, delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }
                              }
                              style={{
                                background: win ? '#16A34A' : leak ? '#DC2626' : '#8B919C',
                              }}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="relative mt-1.5 min-h-[2.5rem]">
            <AnimatePresence initial={false}>
              <motion.p
                key={f.n}
                className="absolute inset-x-0 top-0 m-0 font-serif text-[11px] leading-snug text-muted"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4 }}
                transition={reduced ? { duration: 0 } : { duration: 0.18 }}
              >
                {f.cap}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
