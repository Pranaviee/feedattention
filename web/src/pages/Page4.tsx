import { useState } from 'react'
import { Caveat } from '@/components/FigureChrome'
import SplitHeadline from '@/components/SplitHeadline'
import Tag from '@/components/Tag'
import { inHue, mix } from '@/design/color'
import { NETWORK, nid } from '@/design/network'

/**
 * What is selected in the graph. A neuron shows what it responds to; a
 * synapse shows that σ is a connection between two neurons, not a unit.
 */
type Selection =
  | { kind: 'neuron'; id: number }
  | { kind: 'synapse'; a: number; b: number; input: number }

const TOY_NEURONS = 11

function verdictOf(count: number): { label: string; color: string } {
  if (count >= 5) return { label: 'polysemantic', color: '#DC2626' }
  if (count === 1) return { label: 'selective — one input only', color: '#067A4E' }
  return { label: `mixed — ${count} inputs`, color: '#5C6370' }
}

/**
 * A compact inset: two neurons and the single connection between them, beside
 * the one σ cell that connection is. Enough to fix "neuron = unit, synapse =
 * connection", without a second full heatmap.
 */
function SynapseInset({ a, b, hue }: { a: number; b: number; hue: string }) {
  return (
    <svg viewBox="0 0 268 92" className="mt-3 w-full">
      <defs>
        <marker id="syn-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill={hue} />
        </marker>
      </defs>

      <circle cx="34" cy="46" r="18" fill="#FCFCFD" stroke="#C9CDD4" strokeWidth="1.5" />
      <text x="34" y="51" textAnchor="middle" className="fill-fg font-mono text-[13px] font-bold">
        {a}
      </text>
      <text x="34" y="82" textAnchor="middle" className="fill-faint font-mono text-[8.5px]">
        presynaptic
      </text>

      <line x1="56" y1="46" x2="98" y2="46" stroke={hue} strokeWidth="2.5" markerEnd="url(#syn-arrow)" />

      <circle cx="126" cy="46" r="18" fill="#FCFCFD" stroke="#C9CDD4" strokeWidth="1.5" />
      <text x="126" y="51" textAnchor="middle" className="fill-fg font-mono text-[13px] font-bold">
        {b}
      </text>
      <text x="126" y="82" textAnchor="middle" className="fill-faint font-mono text-[8.5px]">
        postsynaptic
      </text>

      <text x="170" y="24" className="fill-faint font-mono text-[8.5px]">
        one cell of σ
      </text>
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const on = r === 1 && c === 1
          return (
            <rect
              key={`${r}-${c}`}
              x={172 + c * 20}
              y={32 + r * 20}
              width="17"
              height="17"
              rx="2"
              fill={on ? hue : '#F0F1F3'}
              stroke={on ? mix(hue, '#16181D', 0.3) : 'transparent'}
              strokeWidth="1.5"
            />
          )
        }),
      )}
      <text x="232" y="86" textAnchor="end" className="fill-muted font-mono text-[9px]">
        σ[{a}][{b}]
      </text>
    </svg>
  )
}

export default function Page4() {
  const n = NETWORK
  const [sel, setSel] = useState<Selection>({ kind: 'neuron', id: 7 })

  const selNeuron = sel.kind === 'neuron' ? sel.id : null
  const inputsOf = selNeuron !== null ? (n.sets[selNeuron] ?? []) : []
  const verdict = verdictOf(inputsOf.length)
  const synHue = sel.kind === 'synapse' ? inHue(sel.input) : '#7B4BE8'

  const isSelectedEdge = (a: number, b: number) =>
    sel.kind === 'synapse' && sel.a === a && sel.b === b

  return (
    <div>
      <SplitHeadline
        as="h3"
        className="m-0 mb-3 max-w-[860px] text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-fg sm:text-[32px]"
      >
        From the toy to the network
      </SplitHeadline>
      <p className="mb-5 max-w-[680px] font-serif text-base leading-relaxed text-muted">
        The mechanism stays the same. The network gets large.
      </p>

      {/* Scale strip: the toy you just used, beside the network it stands in for. */}
      <div className="mb-6 flex flex-wrap items-center gap-5 rounded-lg border border-line bg-panel2 px-4 py-3.5">
        <div>
          <div className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-faint">
            THE TOY
          </div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: TOY_NEURONS }, (_, i) => (
              <span key={i} className="h-2.5 w-2.5 rounded-full bg-accent/45" />
            ))}
          </div>
          <div className="mt-1.5 font-mono text-[10px] text-muted">
            {TOY_NEURONS} neurons · named by hand
          </div>
        </div>

        <span className="font-mono text-lg text-line-strong">→</span>

        <div>
          <div className="font-mono text-[9.5px] font-semibold tracking-[0.1em] text-faint">
            THIS VIEW
          </div>
          <div className="mt-2 flex max-w-[260px] flex-wrap gap-[3px]">
            {Array.from({ length: n.N }, (_, i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: n.hubs.includes(i) ? '#DC2626' : '#C9CDD4' }}
              />
            ))}
          </div>
          <div className="mt-1.5 font-mono text-[10px] text-muted">
            {n.N} neurons · index only · {n.hubs.length} hubs
          </div>
        </div>
      </div>

      <div className="mb-6 max-w-[1060px]">
        <Caveat title="WHY THERE ARE NO NAMES">
          In real trained networks it is rare for a neuron to correspond to one clean concept
          (Elhage et al., <em>Toy Models of Superposition</em>, 2022) — most are polysemantic. A
          pre-printed label would give away the wrong answer, so here you probe instead.
        </Caveat>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,800px)_minmax(0,1fr)]">
        <div>
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-faint">
              NEURON INTERACTION GRAPH
            </span>
            <span className="font-mono text-[11px] font-medium text-muted">
              hubs: {n.hubs.map((h) => nid(h)).join(', ')}
            </span>
          </div>

          <div className="relative h-[380px] overflow-hidden rounded-lg border border-line bg-panel2 sm:h-[554px]">
            <div className="absolute left-0 top-0 origin-top-left scale-[0.7] sm:scale-[1.0256]">
              <svg viewBox="0 0 780 540" className="h-[540px] w-[780px]">
                {n.edges.map((e, i) => {
                  const a = n.pos[e.a]
                  const b = n.pos[e.b]
                  if (!a || !b) return null
                  const syn = e.kind === 'syn'
                  const bridge = e.kind === 'bridge'
                  const picked = isSelectedEdge(e.a, e.b)
                  const stroke = bridge
                    ? '#C9CDD4'
                    : e.kind === 'hub'
                      ? '#5C6370'
                      : e.input >= 0
                        ? inHue(e.input)
                        : '#8B919C'

                  return (
                    <g key={i}>
                      {syn ? (
                        // Wide invisible hit area — the drawn line is too thin to click.
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="transparent"
                          strokeWidth={16}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSel({ kind: 'synapse', a: e.a, b: e.b, input: e.input })}
                        />
                      ) : null}
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={stroke}
                        strokeWidth={picked ? e.w + 2.5 : bridge ? 0.8 : e.w}
                        strokeDasharray={syn ? '5 4' : bridge ? '6 5' : 'none'}
                        opacity={picked ? 1 : bridge ? 0.5 : e.kind === 'hub' ? 0.45 : syn ? 0.85 : 0.34}
                        strokeLinecap="round"
                        style={syn ? { cursor: 'pointer' } : undefined}
                        onClick={
                          syn
                            ? () => setSel({ kind: 'synapse', a: e.a, b: e.b, input: e.input })
                            : undefined
                        }
                      />
                    </g>
                  )
                })}
              </svg>

              {Array.from({ length: n.N }, (_, i) => {
                const r = n.rad(i)
                const p = n.pos[i]!
                const hub = n.hubs.includes(i)
                const on = selNeuron === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSel({ kind: 'neuron', id: i })}
                    className="absolute"
                    style={{
                      left: p.x - r,
                      top: p.y - r,
                      width: r * 2,
                      height: r * 2,
                      zIndex: on ? 9 : hub ? 6 : 4,
                    }}
                    aria-pressed={on}
                    aria-label={`Probe neuron ${i}`}
                  >
                    <span
                      className="flex h-full w-full items-center justify-center rounded-full font-mono font-bold leading-none"
                      style={{
                        background: n.fillOf(i),
                        border: `${hub ? 2.5 : 1.5}px solid ${mix(n.fillOf(i), '#16181D', 0.35)}`,
                        boxShadow: on ? '0 0 0 5px #7B4BE855' : 'none',
                        color: n.ink(n.fillOf(i)),
                        fontSize: r >= 28 ? 15 : r >= 16 ? 12 : 11,
                      }}
                    >
                      {i}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="mt-3 max-w-[780px] font-serif text-[12.5px] leading-relaxed text-muted">
            Big nodes are hubs — a few neurons carry most of the connections. Dashed lines are the
            three synapses called out below; click one. Node positions reflect connectivity, not
            anatomy.
          </p>
        </div>

        {/* One inspector, two modes. */}
        <div className="rounded-lg border-[1.5px] border-violet bg-panel p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.1em] text-violet-ink">
              PROBE
            </span>
            <span className="text-right text-[10.5px] leading-snug text-faint">
              click a neuron or a dashed synapse
            </span>
          </div>

          {sel.kind === 'neuron' ? (
            <>
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: n.fillOf(sel.id),
                    border: `1px solid ${mix(n.fillOf(sel.id), '#16181D', 0.25)}`,
                  }}
                />
                <span className="font-mono text-base font-bold text-fg">neuron {sel.id}</span>
                <span className="font-mono text-xs font-bold" style={{ color: verdict.color }}>
                  {inputsOf.length}/6
                </span>
              </div>

              <div className="mb-2.5 font-mono text-xs font-medium leading-relaxed text-muted">
                responds to: {inputsOf.map((k) => `in${k + 1}`).join(', ') || '—'}
              </div>

              {/* Grid, not flex: `grid-cols-6` is minmax(0,1fr), so cells
                  shrink with the panel instead of pushing past the card edge
                  the way flex items (min-width:auto) do. No clipping here —
                  the value must stay fully readable to both decimals. */}
              <div className="mb-1 grid grid-cols-6 gap-[2px]">
                {(n.vals[sel.id] ?? []).map((v, k) => (
                  <span
                    key={k}
                    className="whitespace-nowrap rounded-sm px-0 py-1 text-center font-mono text-[9px] font-semibold leading-snug tabular-nums"
                    style={{
                      background: v === 0 ? '#F0F1F3' : mix(inHue(k), '#FFFFFF', 1 - v * 0.8),
                      color: v === 0 ? '#C9CDD4' : v > 0.7 ? '#FFFFFF' : '#16181D',
                    }}
                  >
                    {v === 0 ? '—' : v.toFixed(2)}
                  </span>
                ))}
              </div>
              <div className="mb-3 grid grid-cols-6 gap-[2px]">
                {Array.from({ length: 6 }, (_, k) => (
                  <span
                    key={k}
                    className="whitespace-nowrap text-center font-mono text-[8.5px] font-medium leading-snug text-faint"
                  >
                    in{k + 1}
                  </span>
                ))}
              </div>

              <div className="font-serif text-[12px] leading-snug" style={{ color: verdict.color }}>
                {verdict.label}
              </div>
            </>
          ) : (
            <>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-[11px] w-[11px] rounded-sm" style={{ background: synHue }} />
                <span className="font-mono text-base font-bold text-fg">
                  synapse ({sel.a} → {sel.b})
                </span>
              </div>
              <div
                className="font-mono text-[11px] font-semibold"
                style={{ color: mix(synHue, '#16181D', 0.3) }}
              >
                selective to in{sel.input + 1} — one input, nothing else
              </div>

              <SynapseInset a={sel.a} b={sel.b} hue={synHue} />

              <div className="mt-3 border-t border-line pt-3 font-serif text-[12px] leading-relaxed text-muted">
                A <span className="text-fg">neuron</span> is a unit. A{' '}
                <span className="text-fg">synapse</span> is a connection between two neurons — one
                cell of the neuron × neuron state σ.
              </div>
            </>
          )}
        </div>
      </div>

      {/* The takeaway this whole view exists for. */}
      <div className="mt-8 rounded-lg border border-line-strong bg-panel2 p-4 sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-3.5">
          <span className="font-mono text-[10.5px] font-medium tracking-[0.12em] text-faint">
            WHAT SCALE CHANGES
          </span>
          <span className="h-px flex-1 fade-rule" />
          <Tag variant="cited" />
        </div>
        <p className="m-0 max-w-[720px] font-serif text-[15px] leading-relaxed text-fg">
          A neuron can respond to many things, while an individual synapse can still be selective.
        </p>
        <p className="m-0 mt-2 max-w-[720px] font-serif text-[12.5px] leading-relaxed text-muted">
          Neuron {7} responds to all six inputs; synapse (3 → 0) fires for one. Both are true at
          once. This is BDH’s reported finding — monosemanticity emerging at the level of
          individual synapses — cited from the paper, not measured here.
        </p>
      </div>

      <p className="mt-6 max-w-[680px] font-serif text-[15px] leading-relaxed text-fg">
        Now we know what the fixed memory buys us. What does it cost?
      </p>
    </div>
  )
}
