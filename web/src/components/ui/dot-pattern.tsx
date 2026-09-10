import { useId } from 'react'
import { cn } from '@/lib/utils'

interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  cx?: number
  cy?: number
  cr?: number
}

/** Static SVG pattern — no per-dot React nodes, so large panels stay cheap. */
export function DotPattern({
  width = 16,
  height = 16,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  ...props
}: DotPatternProps) {
  const id = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full text-[#C9CDD4]', className)}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
