import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App'
import ClaimBar, { CLAIM } from '@/components/ClaimBar'
import SectionSpine from '@/components/SectionSpine'
import Tag from '@/components/Tag'
import { isLivemodelAssetPath } from '@/livemodel/asset-path'
import { PAGES } from '@/pages/pages'

describe('ClaimBar', () => {
  it('states the claim in full', () => {
    render(<ClaimBar />)
    expect(screen.getByText(CLAIM)).toBeInTheDocument()
    expect(CLAIM).toContain('without ever growing')
    expect(CLAIM).toContain('collapses much earlier when cues overlap')
  })

  it('exposes a collapse control that reports its state', async () => {
    const user = userEvent.setup()
    render(<ClaimBar />)

    const toggle = screen.getByRole('button', { name: /read the full claim/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: /collapse the claim/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})

describe('SectionSpine', () => {
  it('renders every step as a link, so any step is one click away', () => {
    render(<SectionSpine pages={PAGES} activeId="problem" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(PAGES.length)
    expect(links).toHaveLength(4)

    for (const page of PAGES) {
      expect(screen.getByRole('link', { name: new RegExp(page.title, 'i') })).toHaveAttribute(
        'href',
        `#${page.id}`,
      )
    }
  })

  it('reaches step 3 directly without opening a menu', () => {
    render(<SectionSpine pages={PAGES} activeId="problem" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /the experiment/i })).toHaveAttribute(
      'href',
      '#experiment',
    )
  })

  it('marks only the active step', () => {
    render(<SectionSpine pages={PAGES} activeId="experiment" />)
    const current = screen.getAllByRole('link').filter((el) => el.getAttribute('aria-current'))
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName(/the experiment/i)
  })
})

describe('Tag', () => {
  const cases = [
    ['live', /live/i, /in your browser right now/i],
    ['precomputed', /precomputed/i, /swept offline/i],
    ['cited', /cited/i, /did not reproduce/i],
    ['measured', /measured/i, /not invented in this browser/i],
    ['theory', /theory/i, /closed-form/i],
  ] as const

  for (const [variant, label, tip] of cases) {
    it(`${variant} renders its label and an explanatory tooltip`, () => {
      render(<Tag variant={variant} />)
      expect(screen.getByText(label)).toBeInTheDocument()

      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveTextContent(tip)
    })
  }

  it('links the chip to its tooltip and keeps it keyboard reachable', () => {
    const { container } = render(<Tag variant="live" />)
    const tooltip = screen.getByRole('tooltip')
    const chip = container.querySelector('[aria-describedby]')

    expect(chip).not.toBeNull()
    expect(chip).toHaveAttribute('aria-describedby', tooltip.id)
    expect(chip).toHaveAttribute('tabindex', '0')
  })
})

describe('App shell', () => {
  const slow = 20_000

  it(
    'renders the title once',
    () => {
      render(<App />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Synaptic Memory Explainer',
      )
    },
    slow,
  )

  it(
    'renders a section per step, anchored to its nav link',
    () => {
      const { container } = render(<App />)
      for (const page of PAGES) {
        const section = container.querySelector(`#${page.id}`)
        expect(section).not.toBeNull()
        expect(within(section as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
          page.title,
        )
      }
    },
    slow,
  )

  it(
    'publishes a measured header height for scroll offsets',
    () => {
      render(<App />)
      expect(document.documentElement.style.getPropertyValue('--header-h')).toMatch(/^\d+px$/)
    },
    slow,
  )

  // Regression: the page is client-rendered, so the browser resolves the URL
  // fragment before the sections exist and the native jump does nothing. A
  // shared link to step 3 used to land at the top of the page.
  it(
    'scrolls to the section named by the URL fragment on first load',
    () => {
      const spy = vi.spyOn(Element.prototype, 'scrollIntoView')
      window.location.hash = '#experiment'
      try {
        const { container } = render(<App />)
        expect(spy).toHaveBeenCalled()
        const target = spy.mock.instances[0] as unknown as HTMLElement
        expect(target).toBe(container.querySelector('#experiment'))
      } finally {
        window.location.hash = ''
        spy.mockRestore()
      }
    },
    slow,
  )

  it(
    'does not scroll when there is no fragment',
    () => {
      const spy = vi.spyOn(Element.prototype, 'scrollIntoView')
      try {
        render(<App />)
        expect(spy).not.toHaveBeenCalled()
      } finally {
        spy.mockRestore()
      }
    },
    slow,
  )

  it(
    'carries at least one provenance tag on every step',
    () => {
      const { container } = render(<App />)
      for (const page of PAGES) {
        const section = container.querySelector(`#${page.id}`) as HTMLElement
        const tags = within(section).getAllByRole('tooltip')
        expect(tags.length).toBeGreaterThan(0)
      }
    },
    slow,
  )

  it(
    'embeds the livemodel explainer on the Live Model step',
    () => {
      render(<App />)
      const frame = screen.getByTitle('BDH Explainer')
      expect(frame).toHaveAttribute('src', '/livemodel/index.html?v=compact-h4')
    },
    slow,
  )

  it('does not treat the inspector URL as the explainer SPA', () => {
    expect(isLivemodelAssetPath('/livemodel/index.html')).toBe(true)
    expect(isLivemodelAssetPath('/livemodel/style.css')).toBe(true)
    expect(isLivemodelAssetPath('/')).toBe(false)
    expect(isLivemodelAssetPath('/#live-model')).toBe(false)
  })

  it(
    'puts write and read identities on The Path',
    () => {
      const { container } = render(<App />)
      const path = container.querySelector('#memory-flow') as HTMLElement
      expect(path).not.toBeNull()
      expect(within(path).getByText('Write')).toBeInTheDocument()
      expect(within(path).getByText('Read')).toBeInTheDocument()
      expect(path.querySelector('.katex')).not.toBeNull()
    },
    slow,
  )
})
