import { motion, useScroll } from 'motion/react'
import { cn } from '@/lib/utils'

interface ScrollProgressProps {
  className?: string
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      aria-hidden="true"
      className={cn('origin-left bg-accent', className)}
      style={{ scaleX: scrollYProgress }}
    />
  )
}
