import type { TagVariant } from '@/components/Tag'

/**
 * The four steps of the explainer, in reading order.
 *
 * Figures 3, Query Flow, and Figure 4 live inside The Mechanism as
 * sub-frames — they are labelled § 2 in the source design.
 */
export interface PageMeta {
  id: string
  step: number
  title: string
  blurb: string
  tags: TagVariant[]
}

export const PAGES: PageMeta[] = [
  {
    id: 'problem',
    step: 1,
    title: 'The Problem',
    blurb:
      'Keeping every past token works and never forgets — but the store grows with the conversation, and so does the work per answer.',
    tags: ['cited'],
  },
  {
    id: 'mechanism',
    step: 2,
    title: 'The Mechanism',
    blurb:
      'Store an association by nudging connection strengths that already exist, then read it back with the cue. Nothing is appended.',
    tags: ['live'],
  },
  {
    id: 'experiment',
    step: 3,
    title: 'The Experiment',
    blurb:
      'A fixed table of n=8192 neurons absorbs more context without growing, but measured recall falls as t grows — and much faster when cues overlap.',
    tags: ['measured', 'theory'],
  },
  {
    id: 'live-model',
    step: 4,
    title: 'Live Model',
    blurb:
      'Open the trained d=64 / d=128 checkpoint: the same n×d table, at full scale. Step a token, or generate.',
    tags: ['live', 'cited'],
  },
]
