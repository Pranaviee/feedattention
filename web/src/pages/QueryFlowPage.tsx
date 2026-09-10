import { useState } from 'react'
import { Caveat, Kicker } from '@/components/FigureChrome'
import QueryFlowBoard, { type FlowFrame } from '@/components/QueryFlowBoard'
import SplitHeadline from '@/components/SplitHeadline'
import { FIRING_FRANCE, FIRING_GERMANY, FIRING_JAPAN } from '@/design/eleven'

const FRAMES: FlowFrame[] = [
  {
    n: 1,
    title: 'ESTABLISHING SHOT',
    tag: 'SETUP',
    cur: -1,
    done: [],
    fill: [],
    act: [],
    mode: null,
    cap: 'Eleven functional neurons, no associations written. The table is all zeros and no word has arrived.',
  },
  {
    n: 2,
    title: 'WORD 1 ARRIVES — “France”',
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
    title: 'EMBEDDING → FIRING PATTERN',
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
    n: 4,
    title: 'WRITE INTO MEMORY',
    tag: 'LIVE',
    cur: 0,
    done: [],
    fill: [0],
    act: [...FIRING_FRANCE],
    mode: 'write',
    cap: 'Each active neuron pushes its own firing value into the Paris column. Nothing else in the table moves.',
  },
  {
    n: 5,
    title: 'WORD 2 ARRIVES — “Japan”',
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
    n: 6,
    title: 'WORD 3 ARRIVES — “Germany”',
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
    n: 7,
    title: 'FAST FORWARD',
    tag: 'LIVE',
    cur: -1,
    done: [0, 1, 2, 3, 4, 5],
    fill: [0, 1, 2, 3, 4, 5],
    act: [],
    mode: null,
    note: 'Italy, China, and India follow the exact same rule.',
    cap: 'The completed table — the same eleven rows already locked in Figure 3, unchanged.',
  },
  {
    n: 8,
    title: 'QUERY — “France”',
    tag: 'LIVE',
    cur: 0,
    done: [0, 1, 2, 3, 4, 5],
    fill: [0, 1, 2, 3, 4, 5],
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    readout: true,
    cap: 'Even though France and Japan are in different regions, querying France pulls in a little of Tokyo — because n9 doesn’t respect the region boundary.',
  },
  {
    n: 9,
    title: 'DECODE',
    tag: 'LIVE',
    cur: 0,
    done: [0, 1, 2, 3, 4, 5],
    fill: [0, 1, 2, 3, 4, 5],
    act: [...FIRING_FRANCE],
    mode: 'read',
    query: true,
    readout: true,
    decode: true,
    cap: 'Paris carries the largest value, so the decoder emits it. The leak is still in the vector — it just lost.',
  },
]

export default function QueryFlowPage() {
  const [frame, setFrame] = useState(0)
  const f = FRAMES[frame] ?? FRAMES[0]!

  return (
    <div>
      <Kicker label="§ 2 — QUERY FLOW · STORYBOARD" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SplitHeadline
          as="h3"
          className="m-0 text-xl font-semibold tracking-tight text-fg sm:text-2xl"
        >
          A word arrives, fires a pattern, writes a column.
        </SplitHeadline>
        <span className="ml-auto font-serif text-xs text-faint">
          Frame {f.n} of {FRAMES.length} — step through, or let it play.
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFrame((n) => Math.max(0, n - 1))}
          className="rounded-md border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-muted"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => setFrame((n) => (n + 1) % FRAMES.length)}
          className="rounded-md border border-accent bg-panel px-3 py-1.5 text-xs font-semibold text-accent"
        >
          Next →
        </button>
        <div className="flex flex-wrap gap-1">
          {FRAMES.map((fr, i) => (
            <button
              key={fr.n}
              type="button"
              onClick={() => setFrame(i)}
              aria-current={i === frame ? 'step' : undefined}
              className={
                'h-7 w-7 rounded font-mono text-[10px] font-bold ' +
                (i === frame ? 'bg-fg text-panel' : 'bg-panel2 text-muted hover:text-fg')
              }
            >
              {fr.n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <QueryFlowBoard frame={f} />
      </div>

      <div className="mt-5 max-w-[1000px]">
        <Caveat title="TEACHING LAYOUT — NOT A FINDING">
          Neurons are laid out in regions here to make clustering easy to see. This is a teaching
          layout, not a claim about how real BDH organizes neurons — the paper does not report
          spatial regions. The silhouette is a container, not an anatomical claim.
        </Caveat>
      </div>
    </div>
  )
}
