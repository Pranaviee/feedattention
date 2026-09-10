import { useState } from 'react'

export const CLAIM =
  'A fixed-size synaptic memory can absorb unlimited associations without ever growing — ' +
  'but recall degrades as the table fills, and collapses much earlier when cues overlap.'

interface ClaimBarProps {
  part?: number
  of?: number
}

/**
 * Compact glassy claim strip. Part/of is unused visually; kept so callers
 * can still pass reading position without a layout change.
 */
export default function ClaimBar({ part = 1, of = 4 }: ClaimBarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mx-auto flex max-w-page items-center gap-2.5 px-4 py-1.5 sm:px-[60px]">
      <span className="shrink-0 font-display text-[9px] font-semibold tracking-[0.16em] text-violet">
        CLAIM
      </span>
      <p
        className={
          'min-w-0 flex-1 font-display text-[12px] font-medium leading-snug tracking-[-0.01em] text-fg sm:text-[13px] ' +
          (expanded ? '' : 'line-clamp-1')
        }
      >
        {CLAIM}
      </p>
      <span className="sr-only">
        Part {part} of {of}
      </span>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="shrink-0 rounded border border-line-strong/80 px-1 py-px font-display text-[10px] leading-none text-faint hover:text-fg"
      >
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        <span className="sr-only">{expanded ? 'Collapse the claim' : 'Read the full claim'}</span>
      </button>
    </div>
  )
}
