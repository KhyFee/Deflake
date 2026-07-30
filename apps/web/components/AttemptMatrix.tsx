'use client'

import { useEffect, useRef } from 'react'
import { useMotion } from '@/lib/motion/provider'

export function AttemptMatrix({ attempts }: { attempts: Array<{ attemptId: number; status: string }> }) {
  const ref = useRef<HTMLDivElement>(null)
  const { enabled } = useMotion()
  useEffect(() => {
    if (!enabled || !ref.current) return
    void import('animejs').then((mod) => {
      const animate = (mod as { animate?: Function }).animate || (mod as { default?: Function }).default
      if (typeof animate === 'function') {
        animate({
          targets: ref.current!.querySelectorAll('.attempt-dot'),
          opacity: [0, 1],
          scale: [0.6, 1],
          delay: (_: unknown, i: number) => i * 40,
          duration: 350,
          easing: 'easeOutQuad',
        })
      }
    })
  }, [enabled, attempts])
  return (
    <div ref={ref} style={{ margin: '0.75rem 0' }} aria-label="Attempt outcomes">
      {attempts.map((a) => (
        <span
          key={a.attemptId}
          className={`attempt-dot ${a.status}`}
          title={`#${a.attemptId} ${a.status}`}
          aria-label={`Attempt ${a.attemptId} ${a.status}`}
        />
      ))}
    </div>
  )
}
