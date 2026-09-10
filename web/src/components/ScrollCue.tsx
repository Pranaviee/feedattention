import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

interface ScrollStop {
  id: string
  /**
   * Landing alignment. 'center' suits a standalone card that should sit in
   * the middle of the screen; 'start' suits a section or figure taller than
   * the viewport, which should land with its top under the header.
   */
  align?: ScrollLogicalPosition
}

interface ScrollCueProps {
  /**
   * Candidate stops for the whole document. Ids that are not currently
   * rendered are simply skipped, so a page can gate a figure behind a flag
   * without breaking the chain. Order here does not matter — stops are
   * sorted by real document position at click time.
   */
  stops: Array<string | ScrollStop>
  label?: string
}

/** Tolerance for sub-pixel scroll settling, so a stop never matches itself. */
const AHEAD_EPSILON_PX = 40

function headerLine(): number {
  const raw = document.documentElement.style.getPropertyValue('--header-h')
  return (Number.parseFloat(raw) || 104) + AHEAD_EPSILON_PX
}

/**
 * A single persistent "keep reading" control, fixed to the bottom of the
 * viewport, that walks the entire document top to bottom.
 *
 * Deliberately global rather than one cue per page: a per-section cue can
 * only ever cover its own section, so it vanishes the moment the reader
 * crosses into the next one — and any section without its own cue (or with
 * its figures gated off) becomes a dead end.
 */
export default function ScrollCue({ stops, label = 'keep reading' }: ScrollCueProps) {
  const reduced = usePrefersReducedMotion()
  const [hasNext, setHasNext] = useState(true)

  /** Resolve to live elements, sorted by actual position in the document. */
  const resolve = () =>
    stops
      .map((s) => (typeof s === 'string' ? { id: s, align: 'center' as const } : s))
      .map((s) => ({ el: document.getElementById(s.id), align: s.align ?? 'center' }))
      .filter((s): s is { el: HTMLElement; align: ScrollLogicalPosition } => s.el !== null)
      .sort(
        (a, b) =>
          a.el.getBoundingClientRect().top + window.scrollY -
          (b.el.getBoundingClientRect().top + window.scrollY),
      )

  /**
   * The "still ahead?" test must match how the stop lands, or a stop matches
   * itself and the cue scrolls to where the reader already is.
   */
  const findNext = () => {
    const viewportCenter = window.innerHeight / 2
    const line = headerLine()
    return resolve().find(({ el, align }) => {
      const rect = el.getBoundingClientRect()
      if (align === 'start') return rect.top > line
      return rect.top + rect.height / 2 > viewportCenter + AHEAD_EPSILON_PX
    })
  }

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setHasNext(!atBottom && findNext() !== undefined)
    }

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops])

  if (!hasNext) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex flex-col items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      <button
        type="button"
        onClick={() => {
          const next = findNext()
          next?.el.scrollIntoView({ behavior: 'smooth', block: next.align })
        }}
        aria-label="Scroll to the next part"
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-panel text-muted shadow-card transition-colors hover:border-accent hover:text-accent"
        style={reduced ? undefined : { animation: 'levitate 2.4s ease-in-out infinite' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 6l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
