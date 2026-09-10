import { useEffect, useRef, useState } from 'react'
import ClaimBar from '@/components/ClaimBar'
import Particles from '@/components/Particles'
import ScrollCue from '@/components/ScrollCue'
import SectionSpine from '@/components/SectionSpine'
import Tag from '@/components/Tag'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import Page1 from '@/pages/Page1'
import Page2 from '@/pages/Page2'
import Page3 from '@/pages/Page3'
import LiveModelPage from '@/pages/LiveModelPage'
import { isLivemodelAssetPath } from '@/livemodel/asset-path'
import { PAGES } from '@/pages/pages'

const PARTICLE_COLORS = ['#2C5FE8', '#7B4BE8', '#0D9488', '#16A34A']

const BUILT: Record<string, React.ComponentType> = {
  problem: Page1,
  mechanism: Page2,
  experiment: Page3,
  'live-model': LiveModelPage,
}

function useHeaderHeight(ref: React.RefObject<HTMLElement>): void {
  useEffect(() => {
    const el = ref.current
    if (el === null) return

    const apply = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    }
    apply()

    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
}

function useDeepLink(): void {
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id === '') return
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [])
}

function useActiveSection(): string {
  const [activeId, setActiveId] = useState(PAGES[0]?.id ?? '')

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const headerH = document.documentElement.style.getPropertyValue('--header-h')
      const offset = Number.parseFloat(headerH) || 104

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        const last = PAGES[PAGES.length - 1]
        if (last) setActiveId(last.id)
        return
      }

      let current = PAGES[0]?.id ?? ''
      for (const page of PAGES) {
        const el = document.getElementById(page.id)
        if (el === null) continue
        if (el.getBoundingClientRect().top - offset - 8 <= 0) current = page.id
      }
      setActiveId(current)
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
  }, [])

  return activeId
}

export default function App() {
  const headerRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  useHeaderHeight(headerRef)
  useDeepLink()
  // Live Model owns its own animation elsewhere right now — excluded here so
  // this generic reveal never touches it.
  useScrollReveal(mainRef, { selector: 'main > section', exclude: ['live-model'] })
  const activeId = useActiveSection()
  const activeStep = PAGES.find((p) => p.id === activeId)?.step ?? 1

  if (isLivemodelAssetPath(window.location.pathname)) {
    return (
      <main className="px-6 py-16 font-serif text-muted">
        <p>The checkpoint inspector is missing from this deploy.</p>
      </main>
    )
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <Particles
          className="h-full w-full"
          particleColors={PARTICLE_COLORS}
          particleCount={700}
          particleSpread={8}
          speed={0.08}
          particleBaseSize={90}
          moveParticlesOnHover
          particleHoverFactor={0.6}
          alphaParticles
        />
      </div>

      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-20 border-b border-white/40 bg-panel/35 backdrop-blur-2xl"
      >
        <h1 className="sr-only">Synaptic Memory Explainer</h1>
        <ClaimBar part={activeStep} of={PAGES.length} />
      </header>

      <SectionSpine pages={PAGES} activeId={activeId} />

      {/* One cue for the whole document. Ids that are not rendered (figures
          behind a flag, sections not yet built) are skipped, and the rest are
          walked in real document order — so the chain runs unbroken from the
          first beat to the last section. */}
      <ScrollCue
        stops={[
          'problem-question',
          'problem-claim',
          { id: 'mechanism', align: 'start' },
          { id: 'three-pieces', align: 'start' },
          { id: 'write-demo', align: 'start' },
          { id: 'figure-3', align: 'start' },
          { id: 'query-flow', align: 'start' },
          { id: 'memory-flow', align: 'start' },
          { id: 'figure-4', align: 'start' },
          { id: 'experiment', align: 'start' },
          { id: 'live-model', align: 'start' },
        ]}
      />

      <main
        ref={mainRef}
        style={{ paddingTop: 'var(--header-h)' }}
        className="relative z-10 mx-auto max-w-page overflow-x-hidden px-4 pb-24 sm:pl-[172px] sm:pr-[60px]"
      >
        {PAGES.map((page) => (
          <section
            key={page.id}
            id={page.id}
            aria-labelledby={`${page.id}-heading`}
            style={{ scrollMarginTop: 'var(--header-h)' }}
            className="border-b border-line py-10 last:border-b-0 sm:py-14"
          >
            {(() => {
              const Built = BUILT[page.id]
              if (Built !== undefined) return <Built />
              return (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-accent">
                      {String(page.step).padStart(2, '0')}
                    </span>
                    <h2
                      id={`${page.id}-heading`}
                      className="text-lg font-semibold tracking-tight sm:text-2xl"
                    >
                      {page.title}
                    </h2>
                  </div>
                  <p className="mt-2 max-w-prose font-serif text-[13px] leading-relaxed text-muted sm:text-sm">
                    {page.blurb}
                  </p>
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {page.tags.map((tag) => (
                      <Tag key={tag} variant={tag} />
                    ))}
                  </div>
                  <div className="mt-5 rounded-lg border border-dashed border-line-strong bg-panel2 px-4 py-8 text-center font-mono text-[11px] text-faint sm:py-12">
                    Page {page.step} — not built yet
                  </div>
                </>
              )
            })()}
          </section>
        ))}
      </main>
    </>
  )
}
