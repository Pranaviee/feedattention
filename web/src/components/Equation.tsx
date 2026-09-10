import katex from 'katex'
import { useMemo } from 'react'

interface EquationProps {
  /** Raw LaTeX source — authored by us, never user input. */
  tex: string
  /** Block ('display') math vs inline. */
  display?: boolean
  className?: string
}

/**
 * Renders LaTeX via KaTeX's static `renderToString`. The output is
 * deterministic markup generated from a string we author ourselves (never
 * user-supplied), so `dangerouslySetInnerHTML` is the intended, safe use
 * here — there is no client-side math-typesetting pass to keep in sync.
 */
export default function Equation({ tex, display = false, className = '' }: EquationProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: display }),
    [tex, display],
  )

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
