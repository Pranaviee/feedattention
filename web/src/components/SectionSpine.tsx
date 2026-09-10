import { useEffect, useState } from 'react'
import type { PageMeta } from '@/pages/pages'

interface SectionSpineProps {
  pages: PageMeta[]
  activeId: string
}

/**
 * Fill expressed in the SAME coordinates as the knobs: knob `i` sits at
 * `i / last`, and this returns `(i + fraction through section i) / last`.
 *
 * Raw `scrollY / maxScroll` cannot be used here. The knobs are evenly
 * spaced but the sections are wildly uneven — Mechanism is several times
 * taller than Problem — so a raw scroll fraction runs far ahead of the
 * knob it belongs to, lighting later knobs while an earlier section is
 * still the active one. Measuring against section boundaries keeps the
 * bar and the knobs telling the same story.
 */
function useSectionFill(pages: PageMeta[]): number {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const last = Math.max(pages.length - 1, 1)
      const headerRaw = document.documentElement.style.getPropertyValue('--header-h')
      const line = (Number.parseFloat(headerRaw) || 104) + 8

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        setFill(1)
        return
      }

      let value = 0
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        if (page === undefined) continue
        const el = document.getElementById(page.id)
        if (el === null) continue

        const rect = el.getBoundingClientRect()
        const past = line - rect.top
        if (past < 0) break

        const within = rect.height > 0 ? Math.min(1, past / rect.height) : 0
        value = Math.min(i + within, last) / last
      }

      setFill(Math.min(1, Math.max(0, value)))
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
  }, [pages])

  return fill
}

/**
 * Side reading marker: a slim stem, a knob per section, and a violet fill
 * that grows from the top downward with scroll.
 */
export default function SectionSpine({ pages, activeId }: SectionSpineProps) {
  const fill = useSectionFill(pages)
  const last = Math.max(pages.length - 1, 1)
  // Same source of truth as `isActive`, so a knob can never read as reached
  // while an earlier section is still the active one.
  const activeIndex = pages.findIndex((p) => p.id === activeId)

  return (
    <nav
      aria-label="Explainer steps"
      className="pointer-events-none fixed left-2 top-1/2 z-20 -translate-y-1/2 sm:left-4"
    >
      <div className="pointer-events-auto relative h-[280px] w-11 overflow-visible">
        <div
          className="absolute left-1/2 top-2 bottom-2 w-1 -translate-x-1/2 overflow-hidden rounded-full bg-line/70"
          aria-hidden="true"
        >
          <div
            className="absolute inset-x-0 top-0 rounded-full bg-violet transition-[height] duration-150 ease-out"
            style={{ height: `${fill * 100}%` }}
          />
        </div>

        <ul className="absolute inset-0">
          {pages.map((page, i) => {
            const t = i / last
            const reached = activeIndex >= 0 && i <= activeIndex
            const isActive = page.id === activeId
            return (
              <li
                key={page.id}
                className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${t * 100}%` }}
              >
                <a
                  href={`#${page.id}`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={page.title}
                  className={
                    'group relative flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-card transition-[transform,background-color,border-color] duration-200 ease-out hover:z-20 hover:scale-150 focus-visible:z-20 focus-visible:scale-150 ' +
                    (isActive ? 'z-20 scale-150 ' : 'scale-100 ') +
                    (isActive
                      ? 'border-violet bg-violet'
                      : reached
                        ? 'border-violet bg-panel'
                        : 'border-line-strong bg-panel hover:border-violet')
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      'pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-panel/95 px-2 py-0.5 font-display text-[11px] text-fg shadow-card backdrop-blur-md ' +
                      (isActive
                        ? 'hidden sm:block'
                        : 'hidden group-hover:block group-focus-visible:block')
                    }
                  >
                    {page.title}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
