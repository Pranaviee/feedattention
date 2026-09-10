import source from '@/assets/brain-network-source.png'

export default function VioletBrainNet({ className = '' }: { className?: string }) {
  return (
    <img
      src={source}
      alt="A human brain drawn as a neuron network — nodes and connections only"
      className={`mx-auto h-auto w-auto max-h-[min(36vh,380px)] max-w-[min(100%,520px)] rounded-2xl object-contain select-none ${className}`}
      draggable={false}
      style={{ filter: 'hue-rotate(78deg) saturate(1.12)' }}
    />
  )
}
