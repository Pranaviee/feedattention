import { useId } from 'react'

export type TagVariant = 'live' | 'precomputed' | 'cited' | 'measured' | 'theory'

interface VariantSpec {
  label: string
  tip: string
  chip: string
  dot: string
}

const VARIANTS: Record<TagVariant, VariantSpec> = {
  live: {
    label: 'LIVE',
    tip: 'Computed in your browser right now, from the same code the tests run against.',
    chip: 'border-[#A8E0C8] bg-[#E6F6EF]/70 text-live-ink backdrop-blur-sm',
    dot: 'bg-live-ink',
  },
  precomputed: {
    label: 'PRECOMPUTED',
    tip: 'Swept offline and shipped with the page as data. Not recomputed in your browser.',
    chip: 'border-[#B4C8F5] bg-[#E8EEFD]/70 text-accent-deep backdrop-blur-sm',
    dot: 'bg-accent',
  },
  cited: {
    label: 'CITED',
    tip: 'A published result we did not reproduce. Take it on the source’s authority, not ours.',
    chip: 'border-[#D5D8DE] bg-[#F0F1F3]/70 text-muted backdrop-blur-sm',
    dot: 'bg-faint',
  },
  measured: {
    label: 'MEASURED',
    tip: 'Recorded from the experiment or trained checkpoint. Not invented in this browser.',
    chip: 'border-[#A8E0C8] bg-[#E6F6EF]/70 text-live-ink backdrop-blur-sm',
    dot: 'bg-live-ink',
  },
  theory: {
    label: 'THEORY',
    tip: 'A closed-form statement from the paper. Not a measurement from our checkpoint.',
    chip: 'border-[#B4C8F5] bg-[#E8EEFD]/70 text-accent-deep backdrop-blur-sm',
    dot: 'bg-accent',
  },
}

interface TagProps {
  variant: TagVariant
  className?: string
}

/**
 * Provenance badge. Every visualisation in the app carries one, so a reader
 * can always tell what they are looking at without reading the prose.
 */
export default function Tag({ variant, className = '' }: TagProps) {
  const spec = VARIANTS[variant]
  const tipId = useId()

  return (
    <span className={`group relative inline-flex ${className}`}>
      <span
        tabIndex={0}
        aria-describedby={tipId}
        className={
          'inline-flex cursor-help items-center gap-1.5 rounded px-2 py-[3px] ' +
          `font-mono text-[10px] font-medium tracking-[0.04em] ${spec.chip}`
        }
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${spec.dot} ${variant === 'live' ? 'animate-[pulse-live_1.6s_infinite]' : ''}`}
        />
        {spec.label}
      </span>

      <span
        id={tipId}
        role="tooltip"
        className={
          'pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-max ' +
          'max-w-[min(17rem,78vw)] rounded-md border border-line-strong bg-panel ' +
          'px-2.5 py-1.5 font-sans text-[11px] leading-snug text-muted shadow-card ' +
          'group-hover:block group-focus-within:block'
        }
      >
        {spec.tip}
      </span>
    </span>
  )
}
