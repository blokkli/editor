import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { Component, ComputedRef } from 'vue'

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

/**
 * What the editor's pager provides to the slot of a field in proxy mode that
 * renders the shown block itself (`proxy-mode="slot"`).
 */
export type PagerSlotContext = {
  /** The uuids of the field's blocks. */
  uuids: ComputedRef<string[]>

  /** The uuid of the block the field shows. */
  shownUuid: ComputedRef<string | null>

  /** Whether a block of the field looks muted, as in the editor's lists. */
  isMuted: (uuid: string) => boolean

  /**
   * Claim being the shown block's element; one `<BlokkliItem>` can be. Returns
   * whether the claim holds.
   */
  claim: (uuid: string, key: number) => boolean

  /** Give up a claim. */
  release: (uuid: string, key: number) => void

  /** The component that renders a block of the field in the slot. */
  component: Component
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
