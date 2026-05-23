import type { EntityTranslation } from '#blokkli/editor/types/state'

export type TranslationStateItem = {
  id: string
  code: string
  label: string
  checked: boolean
  translation?: EntityTranslation
}
