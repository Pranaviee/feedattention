import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import Equation from '@/components/Equation'
import SplitHeadline from '@/components/SplitHeadline'
import VioletBrainNet from '@/components/VioletBrainNet'

const EDGE_PAD = 8
const MD_MIN = 768

interface Def {
  term: string
  dim: string
  body: ReactNode
}

const DEFS: Def[] = [
  {
    term: 'Neuron',
    dim: 'detector',
    body: 'A neuron here is a detector with a fixed pattern. When an input matches, it outputs a positive number — it fires. When it does not, it stays silent. For any one input, a few neurons fire and most stay quiet. In this toy we assign those patterns by hand so you can read them; in BDH they are learned.',
  },
  {
    term: 'Synapse',
    dim: 'connection',
    body: 'A synapse is a connection from one neuron to something else, with a strength — a number that can change. Memory is Hebb’s rule: when two things are active together, strengthen the connection. You do not append a new row. You nudge wiring that already exists.',
  },
  {
    term: 'Embedding',
    dim: '1×d then 1×n',
    body: (
      <>
        <p className="m-0">
          Before the memory can do anything, the input is turned into numbers. Here, the input is
          represented as a vector <Equation tex="x \in \mathbb{R}^d" />. Think of it as the
          model’s current numerical representation of the input.
        </p>
        <p className="m-0 mt-3">
          A learned encoder maps that <Equation tex="d" />-dimensional vector into neuron space:
        </p>
        <Equation tex="k = \mathrm{ReLU}(xE) \in \mathbb{R}^n" display className="my-3 block overflow-x-auto" />
        <p className="m-0">
          The result <Equation tex="k" /> is a firing pattern: one number for each neuron. Most
          entries are zero, so only a small number of neurons fire.
        </p>
        <p className="m-0 mt-3">
          <Equation tex="d" /> = width of the input representation.
          <br />
          <Equation tex="n" /> = number of neurons/detectors.
        </p>
      </>
    ),
  },
]

function IntroCard({
  id,
  kicker,
  children,
}: {
  id: string
  kicker: string
  children: string
}) {
  return (
    <article
      id={id}
      style={{ scrollMarginTop: 'var(--header-h)' }}
      className="h-full rounded-2xl border-2 border-accent bg-panel/70 px-6 py-7 text-center shadow-card backdrop-blur-md sm:px-7 sm:py-8"
    >
      <div className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent">
        {kicker}
      </div>
      <p className="m-0 font-display text-[18px] font-semibold leading-snug text-fg sm:text-[21px]">
        {children}
      </p>
    </article>
  )
}

function readTranslateX(el: HTMLElement) {
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  if (typeof DOMMatrix !== 'undefined') return new DOMMatrix(t).m41
  const m = /matrix(?:3d)?\((.+)\)/.exec(t)
  if (!m?.[1]) return 0
  const parts = m[1].split(',').map(Number)
  return t.startsWith('matrix3d') ? (parts[12] ?? 0) : (parts[4] ?? 0)
}

function layoutX(el: HTMLElement, parent: HTMLElement) {
  const er = el.getBoundingClientRect()
  const pr = parent.getBoundingClientRect()
  return { left: er.left - pr.left - readTranslateX(el), width: er.width }
}

export default function MechanismIntro() {
  const stageRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [slack, setSlack] = useState(0)
  const [wide, setWide] = useState(false)

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current
      const left = leftRef.current
      const right = rightRef.current
      const isWide = window.innerWidth >= MD_MIN
      setWide(isWide)
      if (!isWide || !stage || !left || !right) {
        setSlack(0)
        return
      }
      const L = layoutX(left, stage)
      const R = layoutX(right, stage)
      const stageW = stage.getBoundingClientRect().width
      const leftRoom = L.left - EDGE_PAD
      const rightRoom = stageW - (R.left + R.width) - EDGE_PAD
      setSlack(Math.max(0, Math.min(leftRoom, rightRoom)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (stageRef.current) ro.observe(stageRef.current)
    if (leftRef.current) ro.observe(leftRef.current)
    if (rightRef.current) ro.observe(rightRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start 0.85', 'center 0.28'],
  })

  const inward = wide ? Math.min(28, slack * 0.4) : 0
  const animate = Boolean(!reduced && wide)
  const leftX = useTransform(scrollYProgress, (p) => (animate ? inward + p * (-slack - inward) : 0))
  const rightX = useTransform(scrollYProgress, (p) => (animate ? -inward + p * (slack + inward) : 0))
  const brainOp = useTransform(scrollYProgress, [0, 0.25, 1], reduced ? [1, 1, 1] : [0.45, 0.9, 1])
  const brainY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [24, 0])

  return (
    <div className="mb-12">
      <SplitHeadline
        as="h2"
        id="mechanism-heading"
        className="m-0 max-w-[820px] font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-fg sm:text-[40px]"
      >
        The Mechanism
      </SplitHeadline>
      <p className="mt-3 max-w-[640px] font-display text-[18px] font-medium leading-snug text-violet sm:text-[22px]">
        Store it in the wiring.
      </p>
      <p className="mt-4 max-w-[680px] font-serif text-[15px] leading-relaxed text-muted sm:text-base">
        The table’s shape is decided before the first token arrives. What changes is only the
        strengths inside it.
      </p>

      <div ref={stageRef} className="relative my-10">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-stretch md:justify-center md:gap-5">
          <motion.div
            ref={leftRef}
            style={{ x: leftX }}
            className="w-full md:w-[min(42%,400px)]"
          >
            <IntroCard id="brain-machine" kicker="The original">
              The most efficient memory we know is already in the room. You think with it. You used
              it today. Years later it still holds a scene — and it never grew a new row to do that.
            </IntroCard>
          </motion.div>
          <motion.div
            ref={rightRef}
            style={{ x: rightX }}
            className="w-full md:w-[min(42%,400px)]"
          >
            <IntroCard id="the-bet" kicker="The bet">
              We tried to copy that trick for a language model: fix the store’s size in advance, and
              remember by changing connections that already exist — not by appending another token.
            </IntroCard>
          </motion.div>
        </div>

        <motion.div
          style={{ opacity: brainOp, y: brainY }}
          className="mx-auto mt-3 flex w-full justify-center md:mt-4"
        >
          <VioletBrainNet />
        </motion.div>
      </div>

      <h3
        id="three-pieces"
        style={{ scrollMarginTop: 'var(--header-h)' }}
        className="mb-4 mt-4 font-display text-[20px] font-semibold tracking-[-0.015em] text-fg sm:text-[24px]"
      >
        Three pieces
      </h3>
      <p className="mb-6 max-w-[640px] font-serif text-[15px] leading-relaxed text-muted">
        Start with the vocabulary. Everything later — write, read, leak — is these three objects
        talking to each other.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {DEFS.map((d) => (
          <article
            key={d.term}
            className="rounded-2xl border border-line bg-panel/50 p-5 shadow-card backdrop-blur-md"
          >
            <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet">
              {d.dim}
            </p>
            <h4 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-fg">
              {d.term}
            </h4>
            <div className="mt-3 font-serif text-[14px] leading-relaxed text-muted">{d.body}</div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-line bg-panel/50 p-5 shadow-card backdrop-blur-md md:col-start-2">
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="m-0 font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">
                Key
              </h4>
              <p className="m-0 mt-1.5 font-serif text-[14px] leading-relaxed text-muted">
                Key: the neuron’s firing pattern used to identify or address an input.
              </p>
            </div>
            <div>
              <h4 className="m-0 font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">
                Value
              </h4>
              <p className="m-0 mt-1.5 font-serif text-[14px] leading-relaxed text-muted">
                Value: the vector associated with that input that gets stored and later retrieved.
              </p>
            </div>
            <div>
              <h4 className="m-0 font-display text-[17px] font-semibold tracking-[-0.01em] text-fg">
                Memory state / table
              </h4>
              <p className="m-0 mt-1.5 font-serif text-[14px] leading-relaxed text-muted">
                Memory: a fixed matrix whose rows accumulate values whenever the corresponding
                neurons fire.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
