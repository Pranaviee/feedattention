import { useCallback, useRef, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MagicCard({
  children,
  className,
  gradientColor = 'rgba(44, 95, 232, 0.14)',
}: {
  children: ReactNode
  className?: string
  gradientColor?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-line bg-panel backdrop-blur-md',
        className,
      )}
      style={{ '--mx': '50%', '--my': '0px' } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(280px circle at var(--mx) var(--my), ${gradientColor}, transparent 55%)`,
        }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
