import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface QuestionCardProps {
  /** Anchor id — this is what ScrollCue lands on, so it must be exact. */
  id: string
  kicker?: string
  children: ReactNode
}

/**
 * A standalone beat between two figures.
 *
 * A plain, smooth fade + gentle rise — deliberately simple rather than a
 * flashier one-shot effect, because `once: false` means this replays every
 * time the card crosses into view (scrolling back up re-triggers it too), so
 * it needs to hold up on repeat instead of only looking good the first time.
 *
 * `whileInView` handles the enter/exit triggering natively; no hand-rolled
 * IntersectionObserver wiring needed.
 */
export default function QuestionCard({ id, kicker = 'Question', children }: QuestionCardProps) {
  const reduced = useReducedMotion()

  return (
    <div
      id={id}
      style={{ scrollMarginTop: 'var(--header-h)' }}
      className="flex justify-center py-10"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: '0px 0px -10% 0px', amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-[560px] rounded-2xl border-2 border-accent bg-panel px-8 py-9 text-center shadow-card"
      >
        <div className="mb-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-accent">
          {kicker}
        </div>
        <div className="font-display text-[22px] font-semibold leading-snug text-fg sm:text-[26px]">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
