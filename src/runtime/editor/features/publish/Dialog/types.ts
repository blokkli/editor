import type { Validation } from '#blokkli/editor/types/state'

export type MutationStatus = {
  id: string
  success: boolean
  errors?: string[]
  violations?: Validation[]
}

/**
 * A row of the section "Languages".
 */
export type PublishLanguage = {
  /**
   * The langcode, or "all" when every language shares one status.
   */
  id: string
  label: string
  isCurrent: boolean
  isPublished: boolean
}
