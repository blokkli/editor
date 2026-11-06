import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { ComputedRef } from 'vue'

export type FieldDropAlignment = 'vertical' | 'horizontal'

/**
 * A block in one of its languages.
 */
export type BlockTranslation = {
  langcode: string
  isPublished: boolean
  publishOn?: string | null
  unpublishOn?: string | null
}

export type BlockEditContext = {
  isPublished: boolean
  isNew: boolean
  publishOn?: string | null
  unpublishOn?: string | null
  outdatedTranslations?: string[]

  /**
   * The block in each of its languages, the current one included.
   */
  translations?: BlockTranslation[]
}

export type FieldListItem = {
  uuid: string
  bundle: string
  isVisible: boolean
  options?: Record<string, any>
  editContext?: BlockEditContext
  props?: Record<string, any>
}

export type InjectedBlokkliItem = {
  index: ComputedRef<number>
  uuid: string
  options?: Record<string, string> | undefined
  isEditing: boolean
  parentType?: BlockBundleWithNested
  fieldListType?: ValidFieldListTypes
  fragmentName?: string
}
