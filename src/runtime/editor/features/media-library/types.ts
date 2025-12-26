import type { BlokkliIcon } from '#blokkli-build/icons'
import type { AdapterSearchArguments } from '#blokkli/editor/adapter'
import type { PluginConfigInput } from '#blokkli/types'

export type MediaLibraryItem = {
  mediaId: string
  label: string
  context: string
  targetBundles: string[]
  thumbnail?: string
  icon?: BlokkliIcon
  mediaBundle?: string
}

export type FilterTypes = 'checkbox' | 'checkboxes' | 'text' | 'select'

// Extend MediaLibraryGetResults to be generic
export type MediaLibraryGetResults = {
  filters: PluginConfigInput[]
  items: MediaLibraryItem[]
  total: number
  perPage: number
}

export type GetMediaLibraryFunction = (
  e: AdapterSearchArguments,
) => Promise<MediaLibraryGetResults>
