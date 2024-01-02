import type { ConversionItem } from '#blokkli/types'

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
