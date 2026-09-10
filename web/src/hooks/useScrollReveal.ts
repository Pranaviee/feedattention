import { useLayoutEffect } from 'react'
import { animate, stagger } from 'animejs'
import { prefersReducedMotion } from '@/lib/reduced-motion'

interface ScrollRevealOptions {
  /** CSS selector for the section elements to reveal, scoped under the ref. */
  selector: string
  /** Section ids to skip entirely — for content owned by another surface. */
  exclude?: string[]
}

/** Fraction of the viewport a section must reach before it reveals. */
const ROOT_MARGIN = '0px 0px -12% 0px'
/** Safety valve: reveal regardless if the observer never reports. */
const FALLBACK_MS = 1600

/**
 * A one-shot fade + rise as each section scrolls into view.
 *
 * anime.js runs the animation; a plain IntersectionObserver decides *when*.
 * anime v4's own `onScroll` observer was tried first and never fired here,
 * which left every section stranded at opacity 0 — IntersectionObserver is
 * the boring, reliable trigger.
 *
 * Sections are hidden only after we know a real observer is watching them,
 * and a fallback timer reveals anything still hidden, so a trigger that never
 * arrives degrades to "no animation" rather than "no content".
 */
export function useScrollReveal(
  containerRef: React.RefObject<HTMLElement>,
  { selector, exclude = [] }: ScrollRevealOptions,
): void {
  const excludeKey = exclude.join(',')

  useLayoutEffect(() => {
    const root = containerRef.current
    if (root === null) return
    if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return

    const skip = new Set(excludeKey === '' ? [] : excludeKey.split(','))
    const sections = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !skip.has(el.id),
    )
    if (sections.length === 0) return

    /** Each page renders one wrapper div, so cascade its children instead. */
    const partsOf = (section: HTMLElement): HTMLElement[] => {
      const kids = Array.from(section.children) as HTMLElement[]
      const only = kids.length === 1 ? kids[0] : undefined
      const inner = only ? (Array.from(only.children) as HTMLElement[]) : []
      return inner.length > 1 ? inner.slice(0, 8) : kids
    }

    const parts = new Map<HTMLElement, HTMLElement[]>()
    const show = (el: HTMLElement) => {
      el.style.opacity = ''
      el.style.transform = ''
      el.style.willChange = ''
    }

    for (const section of sections) {
      const items = partsOf(section)
      parts.set(section, items)
      for (const item of items) {
        item.style.opacity = '0'
        item.style.transform = 'translateY(18px)'
        item.style.willChange = 'opacity, transform'
      }
    }

    let done = false
    const reveal = (section: HTMLElement) => {
      const items = parts.get(section)
      if (!items) return
      animate(items, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 620,
        delay: stagger(60),
        ease: 'out(3)',
        onComplete: () => {
          for (const item of items) show(item)
        },
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const section = entry.target as HTMLElement
          observer.unobserve(section)
          reveal(section)
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: 0.01 },
    )
    for (const section of sections) observer.observe(section)

    const fallback = window.setTimeout(() => {
      if (done) return
      for (const items of parts.values()) for (const item of items) show(item)
    }, FALLBACK_MS)

    return () => {
      done = true
      window.clearTimeout(fallback)
      observer.disconnect()
      for (const items of parts.values()) for (const item of items) show(item)
    }
  }, [containerRef, selector, excludeKey])
}
