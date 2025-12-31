import type { ConversionItem } from '#blokkli/editor/features/conversions/types'

export const conversions: ConversionItem[] = [
  {
    sourceBundle: 'title',
    targetBundle: 'text',
  },
  {
    sourceBundle: 'text',
    targetBundle: 'title',
  },
  {
    sourceBundle: 'teaser',
    targetBundle: 'button',
  },
]
