import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
  value: number
  startValue?: number
  direction?: 'up' | 'down'
  delay?: number
  decimalPlaces?: number
}

function formatNumber(n: number, decimalPlaces: number) {
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(n.toFixed(decimalPlaces)))
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === 'down' ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: '0px', amount: 0 })

  useEffect(() => {
    if (reduced || !isInView) return
    const timer = window.setTimeout(() => {
      motionValue.set(direction === 'down' ? startValue : value)
    }, delay * 1000)
    return () => window.clearTimeout(timer)
  }, [motionValue, isInView, delay, value, direction, startValue, reduced])

  useEffect(() => {
    if (reduced) return
    return springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = formatNumber(latest, decimalPlaces)
    })
  }, [springValue, decimalPlaces, reduced])

  return (
    <span
      ref={ref}
      className={cn('inline-block tabular-nums tracking-wider', className)}
      {...props}
    >
      {formatNumber(reduced ? value : startValue, decimalPlaces)}
    </span>
  )
}
