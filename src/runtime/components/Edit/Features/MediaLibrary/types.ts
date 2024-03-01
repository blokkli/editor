import type { BlokkliIcon } from '#blokkli/icons'

export type MediaLibraryFilterCheckbox = {
  label: string
  type: 'checkbox'
}

export type MediaLibraryFilterCheckboxes = {
  label: string
  type: 'checkboxes'
  options: Record<string, string>
}

export type MediaLibraryFilterText = {
  label: string
  type: 'text'
  placeholder: string
}

export type MediaLibraryFilterSelect = {
  label: string
  type: 'select'
  default: string
  options: Record<string, string>
}

export type MediaLibraryFilter =
  | MediaLibraryFilterCheckbox
  | MediaLibraryFilterCheckboxes
  | MediaLibraryFilterText
  | MediaLibraryFilterSelect

export type MediaLibraryItem = {
  mediaId: string
  label: string
  context: string
  blockBundle: string
  thumbnail?: string
  icon?: BlokkliIcon
  mediaBundle?: string
}

// Extend MediaLibraryGetResults to be generic
export type MediaLibraryGetResults<F extends Record<string, FilterTypes>> = {
  filters: {
    [K in keyof F]: F[K] extends 'checkbox'
      ? MediaLibraryFilterCheckbox
      : F[K] extends 'checkboxes'
      ? MediaLibraryFilterCheckboxes
      : F[K] extends 'text'
      ? MediaLibraryFilterText
      : MediaLibraryFilterSelect
  }
  items: MediaLibraryItem[]
  total: number
  perPage: number
}

// Define a mapping from filter types to data types
type FilterValueTypes = {
  checkbox: boolean
  checkboxes: string[]
  text: string
  select: string
}

export type MediaLibraryGetResultsData<F extends Record<string, FilterTypes>> =
  {
    page: number
    filters: {
      [K in keyof F]: FilterValueTypes[F[K]]
    }
  }

export type FilterTypes = 'checkbox' | 'checkboxes' | 'text' | 'select'

export type FilterTypeMapping = {
  [key in FilterTypes]: MediaLibraryFilter
}

export type GetMediaLibraryFunction<
  F extends Record<string, FilterTypes> = {},
> = (e: MediaLibraryGetResultsData<F>) => Promise<MediaLibraryGetResults<F>>
