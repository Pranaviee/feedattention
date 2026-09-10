import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react'
import { animate, splitText, stagger } from 'animejs'
import { prefersReducedMotion } from '@/lib/reduced-motion'

interface SplitHeadlineProps {
  children: ReactNode
  /** Rendered tag. Headings should stay headings for the outline. */
  as?: ElementType
  className?: string
  /** Seconds before the reveal starts. */
  delay?: number
  id?: string
}

/**
 * Headline that reveals word by word as it enters view.
 *
 * Uses anime v4's own `splitText` with `accessible: true`, so the split spans
 * carry `aria-hidden` and the element keeps a readable accessible name — the
 * text is still one string to a screen reader, not 40 loose characters.
 *
 * The reveal is skipped entirely under `prefers-reduced-motion`, and the
 * splitter is reverted on unmount so the DOM goes back to plain text.
 */
export default function SplitHeadline({
  children,
  as: Tag = 'h3',
  className = '',
  delay = 0,
  id,
}: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null) return
    if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return

    const split = splitText(el, { words: true, chars: false, accessible: true })
    const words = split.words as HTMLElement[]
    if (words.length === 0) {
      split.revert()
      return
    }

    for (const w of words) {
      w.style.display = 'inline-block'
      w.style.opacity = '0'
      w.style.transform = 'translateY(0.5em) rotate(1.5deg)'
      w.style.willChange = 'opacity, transform'
    }

    let animation: ReturnType<typeof animate> | null = null
    const play = () => {
      animation = animate(words, {
        opacity: [0, 1],
        translateY: ['0.5em', '0em'],
        rotate: ['1.5deg', '0deg'],
        duration: 760,
        delay: stagger(42, { start: delay * 1000 }),
        ease: 'out(3)',
        onComplete: () => {
          for (const w of words) {
            w.style.opacity = ''
            w.style.transform = ''
            w.style.willChange = ''
          }
        },
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          observer.unobserve(entry.target)
          play()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    observer.observe(el)

    // Safety valve: never leave a headline stuck invisible.
    const fallback = window.setTimeout(() => {
      for (const w of words) w.style.opacity = ''
    }, 2000)

    return () => {
      window.clearTimeout(fallback)
      observer.disconnect()
      animation?.revert()
      split.revert()
    }
  }, [delay, children])

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  )
}
