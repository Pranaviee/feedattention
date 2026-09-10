import type { TagVariant } from '@/components/Tag'
import Tag from '@/components/Tag'

export function Kicker({
  label,
  tags = ['live'],
}: {
  label: string
  tags?: TagVariant[]
}) {
  return (
    <div className="mb-3 flex items-center gap-3.5">
      <span className="font-mono text-[10.5px] font-medium tracking-[0.12em] text-faint">
        {label}
      </span>
      <span className="h-px flex-1 fade-rule" />
      {tags.map((t) => (
        <Tag key={t} variant={t} />
      ))}
    </div>
  )
}

export function Caveat({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warn bg-[rgb(255_248_238_/_0.55)] p-3.5 backdrop-blur-md sm:p-4">
      <span className="mt-0.5 w-[3px] self-stretch rounded-sm bg-warn" />
      <div>
        {title ? (
          <div className="mb-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-warn-ink">
            {title}
          </div>
        ) : null}
        <p className="m-0 font-serif text-[14px] leading-relaxed text-fg">{children}</p>
      </div>
    </div>
  )
}

export function FigureNav({
  items,
}: {
  items: Array<{ href: string; label: string }>
}) {
  return (
    <nav aria-label="Mechanism figures" className="mb-8 flex flex-wrap gap-2">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="rounded-md border border-line-strong bg-panel px-2.5 py-1.5 font-mono text-[10.5px] text-muted hover:border-accent hover:text-accent"
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
