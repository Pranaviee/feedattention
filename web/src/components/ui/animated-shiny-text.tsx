import { type ComponentPropsWithoutRef, type CSSProperties, type FC } from 'react'
import { cn } from '@/lib/utils'

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<'span'> {
  shimmerWidth?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={{ '--shiny-width': `${shimmerWidth}px` } as CSSProperties}
      className={cn(
        'inline-block bg-gradient-to-r from-transparent via-fg via-50% to-transparent bg-clip-text text-faint',
        '[background-size:var(--shiny-width)_100%] bg-no-repeat',
        'motion-safe:animate-shiny-text',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
