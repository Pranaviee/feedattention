import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import Equation from '@/components/Equation'
import QueryFlowBoard, { type FlowFrame, type FlowMode } from '@/components/QueryFlowBoard'
import { FIRING_FRANCE, FIRING_GERMANY, FIRING_JAPAN } from '@/design/eleven'

/** Motion (~0.4s) + a beat to read the board. Play advances on this cadence. */
const AUTO_MS = 1650
const FULL = [0, 1, 2, 3, 4, 5]

const PATH_FRAMES: FlowFrame[] = [
  {
    n: 1,
    title: 'WORD — “France”',
    tag: 'ILLUSTRATION',
    cur: 0,
    done: [],
    fill: [],
    act: [],
    mode: null,
    cap: 'The word arrives. Eleven neurons, a table of zeros — nothing written yet.',
  },
  {
    n: 2,
    title: 'x',
    tag: 'ILLUSTRATION',
    cur: 0,
    done: [],
    fill: [],
    act: [],
    mode: null,
    emb: 'France',
    cap: 'The word is tokenised and encoded into a dense vector. Eight bars stand in for that vector.',
  },
  {
    n: 3,
    title: 'encoder',
    tag: 'LIVE',
    cur: 0,
    done: [],
    fill: [],
    act: [],
    mode: null,
    emb: 'France',
    arrow: true,
    cap: 'A trained encoder would map this vector onto a sparse firing pattern.',
  },
  {
    n: 4,
    title: 'k — fire',
    tag: 'LIVE',
    cur: 0,
    done: [],
    fill: [],
    act: [...FIRING_FRANCE],
    mode: 'fire',
    emb: 'France',
    arrow: true,
    cap: 'Four neurons respond. They light in order of strength — n0 at 0.5, n9 at 0.6, n1 at 0.7, n3 at 1.0, brightest last.',
  },
  {
    n: 5,
    title: 'write Paris into ρ',
    tag: 'LIVE',
    cur: 0,
    done: [],
    fill: [0],
    act: [...FIRING_FRANCE],
    mode: 'write',
    cap: 'Each active neuron pushes its own firing value into the Paris column. Nothing else in the table moves.',
  },
  {
    n: 6,
    title: 'Japan → Tokyo',
    tag: 'LIVE',
    cur: 3,
    done: [0],
    fill: [0, 3],
    act: [...FIRING_JAPAN],
    mode: 'write',
    emb: 'Japan',
    arrow: true,
    alsoFrance: true,
    cap: 'n0 fires a second time; the Asia side takes over. n9 is now lit for France and Japan both — the dashed violet line is the association it already holds.',
  },
  {
    n: 7,
    title: 'Germany → Berlin',
    tag: 'LIVE',
    cur: 1,
    done: [0, 3],
    fill: [0, 3, 1],
    act: [...FIRING_GERMANY],
    mode: 'write',
    emb: 'Germany',
    arrow: true,
    cap: 'Same rule, third column. n10 is the other quirk: Germany now, China later.',
  },
  {
    n: 8,
    title: 'query France',
    tag: 'LIVE',
    cur: 0,
    done: FULL,
    fill: FULL,
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    cap: 'Italy, China, and India filled the rest of the table the same way. France fires the same pattern again.',
  },
  {
    n: 9,
    title: 'read',
    tag: 'LIVE',
    cur: 0,
    done: FULL,
    fill: FULL,
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    readout: true,
    cap: 'Sum the active rows. Paris leads. Tokyo leaks in because n9 does not respect the region boundary.',
  },
  {
    n: 10,
    title: 'decode — Paris',
    tag: 'LIVE',
    cur: 0,
    done: FULL,
    fill: FULL,
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    readout: true,
    decode: true,
    cap: 'Paris carries the largest value, so the decoder emits it. The leak is still in the vector — it just lost.',
  },
  {
    n: 11,
    title: 'Recall is a mixture, not a lookup.',
    tag: 'LIVE',
    cur: 0,
    done: FULL,
    fill: FULL,
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    readout: true,
    decode: true,
    cap: 'The leak is still in the vector. Recall is a mixture, not a lookup.',
  },
  ]

function PathRelations({ mode }: { mode: FlowMode }) {
  const writeOn = mode === 'write' || mode === 'fire'
  const readOn = mode === 'read'

  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <div
        className={`rounded-md border bg-panel2 px-3 py-2.5 ${
          writeOn ? 'border-accent' : 'border-line'
        }`}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Write</div>
        <Equation
          className="mt-1.5 block overflow-x-auto text-[15px] text-fg [&_.katex-display]:my-1"
          display
          tex="\Delta\rho = k \otimes v^{\mathsf{T}}"
        />
        <Equation
          className="block overflow-x-auto text-[15px] text-fg [&_.katex-display]:my-1"
          display
          tex="\rho \leftarrow \rho + \Delta\rho"
        />
        <p className="mt-1 mb-0 font-serif text-[13px] leading-snug text-muted">
          Cell-wise <Equation tex="\Delta\rho_{ij} = k_i\,v_j" />. The table stays n×d.
        </p>
      </div>
      <div
        className={`rounded-md border bg-panel2 px-3 py-2.5 ${
          readOn ? 'border-live' : 'border-line'
        }`}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Read</div>
        <Equation
          className="mt-1.5 block overflow-x-auto text-[15px] text-fg [&_.katex-display]:my-1"
          display
          tex="\hat{v} = q^{\mathsf{T}}\rho"
        />
        <p className="mt-1 mb-0 font-serif text-[13px] leading-snug text-muted">
          A mixture of stored values, weighted by how much the cue overlaps each key.
        </p>
      </div>
    </div>
  )
}

export default function MemoryFlow() {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(false)
  const frame = PATH_FRAMES[i] ?? PATH_FRAMES[0]!

  useEffect(() => {
    if (!auto || reduced) return
    if (i >= PATH_FRAMES.length - 1) {
      setAuto(false)
      return
    }
    const id = window.setTimeout(() => setI((s) => s + 1), AUTO_MS)
    return () => window.clearTimeout(id)
  }, [auto, reduced, i])

  return (
    <div id="memory-flow" className="mb-16" style={{ scrollMarginTop: 'var(--header-h)' }}>
      <h3 className="m-0 font-display text-[22px] font-semibold tracking-[-0.02em] text-fg sm:text-[32px]">
        The path
      </h3>
      <p className="mt-2 max-w-[560px] font-serif text-[15px] leading-relaxed text-muted">
        One association, traced through the objects you just named.
      </p>
      <PathRelations mode={frame.mode} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (auto) {
              setAuto(false)
              return
            }
            setAuto(true)
            setI((s) => (s >= PATH_FRAMES.length - 1 ? 0 : s + 1))
          }}
          aria-pressed={auto}
          className="rounded-md bg-accent px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_0_0_3px_#2C5FE833] hover:bg-accent/90"
        >
          {auto ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => setI((s) => (s + 1) % PATH_FRAMES.length)}
          className="rounded-md border-2 border-accent bg-panel px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-accent hover:bg-[#E8EEFD]"
        >
          Next →
        </button>
        <span className="font-serif text-[13px] text-muted">
          {auto ? 'Playing through the frames.' : 'Press Play, or Next to step one frame at a time.'}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          {i + 1} / {PATH_FRAMES.length}
        </span>
        <div className="ml-auto flex gap-1">
          {PATH_FRAMES.map((b, idx) => (
            <button
              key={b.n}
              type="button"
              aria-label={`Step ${idx + 1}: ${b.title}`}
              onClick={() => {
                setAuto(false)
                setI(idx)
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? 'w-5 bg-accent' : idx < i ? 'w-2.5 bg-accent/40' : 'w-2.5 bg-line'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <QueryFlowBoard frame={frame} />
      </div>
    </div>
  )
}
