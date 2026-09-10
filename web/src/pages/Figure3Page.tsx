import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'animejs'
import { Caveat, Kicker } from '@/components/FigureChrome'
import SplitHeadline from '@/components/SplitHeadline'
import { DotPattern } from '@/components/ui/dot-pattern'
import { MagicCard } from '@/components/ui/magic-card'
import { ShineBorder } from '@/components/ui/shine-border'
import { HUES, mix } from '@/design/color'
import { prefersReducedMotion } from '@/lib/reduced-motion'
import {
  DIMS,
  EDGE_SPECS,
  FIRING_FRANCE,
  FRANCE_READOUT,
  NEURON_DEFS,
  borderOf,
  fillOf,
  type NeuronDef,
} from '@/design/eleven'

const COLS = DIMS

function NeuronNode({
  d,
  dimmed,
  hovered,
  querying,
  onEnter,
  onLeave,
}: {
  d: NeuronDef
  dimmed: boolean
  hovered: boolean
  querying: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const base = fillOf(d)
  const shadow = hovered
    ? '0 0 0 4px #7B4BE844'
    : querying && !dimmed
      ? '0 0 0 5px #16A34A33'
      : '0 1px 2px #16181D22'

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      data-fire-node={querying && !dimmed ? '' : undefined}
      className="absolute cursor-pointer"
      style={{
        left: d.x - d.r,
        top: d.y - d.r,
        width: d.r * 2,
        height: d.r * 2,
        opacity: dimmed ? 0.26 : 1,
        transition: 'opacity .25s',
        zIndex: hovered ? 6 : 4,
      }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{ background: base, border: borderOf(d), boxShadow: shadow }}
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
            fontSize: d.r > 26 ? 11 : 10,
            color: d.kind === 'region' ? mix(d.hue, '#16181D', 0.45) : '#FFFFFF',
          }}
        >
          {d.id}
        </span>
      </div>
      <div
        className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap font-sans text-[10.5px] leading-snug tracking-[0.04em]"
        style={{
          fontWeight: d.kind === 'quirk' ? 700 : 500,
          color: d.kind === 'quirk' ? HUES.QUIRK : '#5C6370',
        }}
      >
        {d.label}
      </div>
    </div>
  )
}

export default function Figure3Page() {
  const [hover, setHover] = useState<string | null>(null)
  const [query, setQuery] = useState(false)
  const fire: readonly string[] = query ? FIRING_FRANCE : []
  const byId = useMemo(() => Object.fromEntries(NEURON_DEFS.map((d) => [d.id, d])), [])
  const brainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query || !brainRef.current || prefersReducedMotion()) return
    const nodes = brainRef.current.querySelectorAll<HTMLElement>('[data-fire-node]')
    if (nodes.length === 0) return
    const anim = animate(nodes, {
      scale: [1, 1.12, 1],
      duration: 520,
      ease: 'out(2)',
    })
    return () => {
      anim.revert()
    }
  }, [query])

  return (
    <div>
      <Kicker label="§ 2 — THE MECHANISM · FIGURE 3" />
      <SplitHeadline
        as="h3"
        className="m-0 mb-3 max-w-[820px] text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg sm:text-[32px]"
      >
        One fixed table, eleven neurons, six associations.
      </SplitHeadline>
      <p className="mb-5 max-w-[680px] font-serif text-base leading-relaxed text-muted">
        The same numbers appear twice below: as a synapse heatmap and as a diagram of which neurons
        connect to which. Nothing is added between the two views — they are the same eleven rows.
      </p>
      <div className="mb-6 max-w-[1000px]">
        <Caveat title="TEACHING LAYOUT — NOT A FINDING">
          Neurons are laid out in regions here to make clustering easy to see. This is a teaching
          layout, not a claim about how real BDH organizes neurons — the paper does not report
          spatial regions.
        </Caveat>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[780px_minmax(0,1fr)]">
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-faint">
              BRAIN VIEW · SPATIAL LAYOUT
            </span>
            <span className="font-mono text-[11px] font-medium text-muted">
              {query ? 'querying “France” · 4 of 11 neurons active' : 'idle · showing all 11 neurons'}
            </span>
          </div>
          <div
            ref={brainRef}
            className="relative h-[540px] w-full max-w-[780px] overflow-hidden rounded-lg border border-line bg-panel2"
          >
            <ShineBorder shineColor={query ? '#16A34A' : '#2C5FE8'} duration={18} />
            <DotPattern width={22} height={22} cr={0.7} className="text-[#C9CDD4]/70" />
            <svg viewBox="0 0 780 540" className="absolute inset-0 h-full w-full">
              <ellipse
                cx="170"
                cy="272"
                rx="138"
                ry="184"
                fill="#2C5FE808"
                stroke="#B4C8F5"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <ellipse
                cx="610"
                cy="272"
                rx="138"
                ry="184"
                fill="#0D948808"
                stroke="#9FD6D0"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              {EDGE_SPECS.map(([a, b, color, w, dash], i) => {
                const A = byId[a]
                const B = byId[b]
                if (!A || !B) return null
                const rel = query ? (fire.includes(a) ? 1 : 0.08) : 0.55
                const touchQ = query && a === 'n9' && b === 'n6'
                return (
                  <line
                    key={i}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke={touchQ ? '#DC2626' : color}
                    strokeWidth={touchQ ? 3 : query && rel === 1 ? w + 1 : w}
                    strokeDasharray={dash ?? 'none'}
                    opacity={query ? (touchQ ? 1 : rel) : 0.5}
                    strokeLinecap="round"
                  />
                )
              })}
            </svg>
            <div className="absolute left-[22px] top-4 text-[10px] font-semibold tracking-[0.16em] text-accent-deep">
              EUROPE SIDE
            </div>
            <div className="absolute right-[22px] top-4 text-[10px] font-semibold tracking-[0.16em] text-[#0B6E66]">
              ASIA SIDE
            </div>
            <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-[0.16em] text-violet">
              BETWEEN — QUIRK NEURONS
            </div>
            {NEURON_DEFS.map((d) => (
              <NeuronNode
                key={d.id}
                d={d}
                dimmed={query && !fire.includes(d.id)}
                hovered={hover === d.id}
                querying={query}
                onEnter={() => setHover(d.id)}
                onLeave={() => setHover(null)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setQuery(true)}
              className="rounded-md border border-accent px-4 py-2.5 text-[12.5px] font-semibold"
              style={{
                background: query ? '#2C5FE8' : '#FFFFFF',
                color: query ? '#FCFCFD' : '#2C5FE8',
              }}
            >
              Query: France
            </button>
            <button
              type="button"
              onClick={() => setQuery(false)}
              className="rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-[12.5px] font-medium text-muted"
            >
              Clear
            </button>
            <span className="font-serif text-xs text-faint">
              Firing neurons stay lit; the red line is the leak.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          <MagicCard className="p-4">
            <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-faint">
              COLOUR LEGEND
            </div>
            <div className="flex flex-col gap-2.5 text-xs leading-normal text-muted">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-[#5C6370] bg-[#8B919C]" />
                <div>
                  <b className="font-semibold text-fg">n0 — flat neutral.</b> One abstract feature
                  (“country-ness”), so it is not a blend of anything.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-2 border-accent bg-[#8AA6F1]" />
                <div>
                  <b className="font-semibold text-fg">Region hue, softer.</b> n1 Europe, n2 Asia —
                  monosemantic at the region level.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-2 border-[#24429E] bg-accent" />
                <div>
                  <b className="font-semibold text-fg">Region hue, full.</b> One country each — more
                  specific, more confident.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-2 border-dashed border-violet bg-[#1C79B8]" />
                <div>
                  <b className="font-semibold text-fg">50/50 blend.</b> n9, n10 — split fill in the
                  diagram, blended hue{' '}
                  <span className="font-mono">{mix(HUES.EU, HUES.AS, 0.5)}</span> in the table.
                </div>
              </div>
            </div>
          </MagicCard>
          <div className="rounded-lg border border-violet bg-[#F6EFFE] p-4">
            <div className="mb-2 font-mono text-[10px] font-bold tracking-[0.12em] text-violet-ink">
              ABOUT n9 AND n10
            </div>
            <p className="m-0 font-serif text-[13.5px] leading-relaxed text-fg">
              Most neurons here are clean, single-region detectors — that’s the teaching layout
              talking. These two are not. They respond to one country from each region, so their
              colour can’t be a single hue. This is closer to how a real trained network’s neurons
              actually behave: most units in BDH are shared across many things, and the paper
              reports true single-concept behaviour only at the level of specific synapses, not as
              a rule for all neurons.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[34px]">
        <Kicker label="SYNAPSE HEATMAP · SAME ELEVEN ROWS" />
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="w-[230px] border-b border-line-strong bg-panel2 px-4 py-2 text-left text-[10.5px] font-semibold tracking-[0.06em] text-muted">
                    NEURON
                  </th>
                  {COLS.map((c, i) => (
                    <th
                      key={c}
                      className="border-b border-line-strong px-1.5 py-2 text-center text-[10.5px] font-semibold tracking-[0.06em]"
                      style={{
                        color: i < 3 ? '#1E4FC4' : '#0B6E66',
                        background: i < 3 ? '#E8EEFD' : '#E4F2F0',
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NEURON_DEFS.map((d) => {
                  const isHov = hover === d.id
                  const lit = query ? fire.includes(d.id) : true
                  return (
                    <tr
                      key={d.id}
                      style={{
                        background: isHov ? '#F0F1F3' : 'transparent',
                        opacity: lit ? 1 : 0.34,
                        transition: 'opacity .25s',
                      }}
                      onMouseEnter={() => setHover(d.id)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <td className="border-b border-[#F0F1F3] px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{
                              background: d.kind === 'region' ? mix(d.hue, '#FFFFFF', 0.34) : d.hue,
                              border: `1px solid ${d.kind === 'quirk' ? HUES.QUIRK : mix(d.hue, '#16181D', 0.2)}`,
                            }}
                          />
                          <span className="font-mono text-[11px] font-semibold text-fg">{d.id}</span>
                          <span
                            className="text-[11.5px] font-medium"
                            style={{ color: d.kind === 'quirk' ? HUES.QUIRK : '#5C6370' }}
                          >
                            {d.label}
                          </span>
                        </span>
                      </td>
                      {d.vals.map((v, i) => (
                        <td
                          key={i}
                          className="border-b border-[#F0F1F3] px-1.5 py-2 text-center font-mono text-[12.5px] tabular-nums"
                          style={{
                            fontWeight: v >= 1 ? 700 : 500,
                            background: v === 0 ? '#FCFCFD' : mix(d.hue, '#FFFFFF', 1 - v * 0.85),
                            color: v === 0 ? '#C9CDD4' : v >= 0.7 ? '#FFFFFF' : '#16181D',
                          }}
                        >
                          {v === 0 ? '0' : v.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {query && (
                  <tr>
                    <td className="border-t-[1.5px] border-line-strong bg-panel2 px-4 py-2.5 text-[11.5px] font-bold text-fg">
                      READOUT · query “France”
                    </td>
                    {FRANCE_READOUT.map((v, i) => {
                      const win = i === 0
                      const leak = i === 3
                      return (
                        <td
                          key={i}
                          className="border-t-[1.5px] border-line-strong px-1.5 py-2.5 text-center font-mono text-[13px] tabular-nums"
                          style={{
                            fontWeight: win ? 700 : 500,
                            background: win ? '#E6F6EF' : leak ? '#FDEAEA' : '#F6F7F9',
                            color: win ? '#067A4E' : leak ? '#DC2626' : '#5C6370',
                          }}
                        >
                          {v.toFixed(2)}
                          <div className="mt-1.5 h-1.5 rounded-sm bg-line">
                            <div
                              className="h-1.5 rounded-sm"
                              style={{
                                width: `${(v / 2.1) * 100}%`,
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
          {query && (
            <div className="flex gap-2.5 border-t border-line bg-[#FDEAEA] p-3.5">
              <span className="w-[3px] shrink-0 self-stretch rounded-sm bg-danger" />
              <p className="m-0 max-w-[1000px] font-serif text-[13.5px] leading-relaxed text-fg">
                Even though France and Japan are in different regions, querying France pulls in a
                little of Tokyo — because n9 doesn’t respect the region boundary.
              </p>
            </div>
          )}
          <div className="border-t border-line bg-panel2 px-4 py-3 font-serif text-xs leading-relaxed text-muted">
            Cell shade is the synapse weight after all six associations are written; zeros stay
            unpainted. Hovering a row lights the same neuron in the brain view — one dataset, two
            projections.
          </div>
        </div>
      </div>
    </div>
  )
}
