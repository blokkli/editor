import type { BlokkliAvailableType } from '#blokkli/types'

export const availableTypes: BlokkliAvailableType[] = [
  {
    entityType: 'content',
    bundle: 'page',
    fieldName: 'content',
    allowedTypes: ['text', 'image', 'title', 'button', 'teaser', 'grid'],
  },
  {
    entityType: 'content',
    bundle: 'page',
    fieldName: 'footer',
    allowedTypes: ['text'],
  },
  {
    entityType: 'block',
    bundle: 'grid',
    fieldName: 'blocks',
    allowedTypes: ['teaser'],
  },
]
