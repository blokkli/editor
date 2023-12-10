import type { BlokkliConversionItem } from '#blokkli/types'

export const conversions: BlokkliConversionItem[] = [
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
