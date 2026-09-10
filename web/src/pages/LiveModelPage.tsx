import { useEffect, useState } from 'react'
import { Kicker } from '@/components/FigureChrome'

const FRAME_SRC = '/livemodel/index.html?v=compact-h4'
const MIN_FRAME_H = 680
const MAX_FRAME_H = 1600

export default function LiveModelPage() {
  const [frameH, setFrameH] = useState(MIN_FRAME_H)

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as { type?: string; height?: number }
      if (data?.type !== 'livemodel-height' || typeof data.height !== 'number') return
      const next = Math.round(data.height)
      if (!Number.isFinite(next)) return
      setFrameH(Math.min(MAX_FRAME_H, Math.max(MIN_FRAME_H, next)))
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  return (
    <div>
      <h2 id="live-model-heading" className="sr-only">
        Live Model
      </h2>
      <Kicker label="§ 4 — LIVE MODEL" tags={['live', 'cited']} />
      <p className="m-0 mb-4 max-w-[820px] text-[26px] font-semibold leading-[1.12] tracking-[-0.022em] text-fg sm:text-[32px]">
        The synaptic table, live.
      </p>
      <p className="mb-5 max-w-[680px] font-serif text-base leading-relaxed text-muted">
        The trained checkpoint — same n×d table as the path you just walked, now at full scale. Step one
        token, or generate a continuation.
      </p>
      <div className="-mx-4 overflow-hidden rounded-xl border border-line bg-panel/40 shadow-card backdrop-blur-md sm:-mx-[60px]">
        <iframe
          title="BDH Explainer"
          src={FRAME_SRC}
          className="block w-full border-0 bg-transparent"
          style={{ height: frameH, minHeight: MIN_FRAME_H }}
        />
      </div>
    </div>
  )
}
