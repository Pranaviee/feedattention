import { motion, type MotionStyle, type Transition } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

interface BorderBeamProps {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  transition?: Transition
  className?: string
  style?: React.CSSProperties
  reverse?: boolean
  initialOffset?: number
  borderWidth?: number
}

export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = '#2C5FE8',
  colorTo = '#16A34A',
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ border: `${borderWidth}px solid transparent` }}
    >
      <motion.div
        className={cn('absolute aspect-square', className)}
        style={
          {
            width: size,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            ...style,
          } as MotionStyle
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  )
}
