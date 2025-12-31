import type { Validation } from '#blokkli/editor/types/state'

export type MutationStatus = {
  id: string
  success: boolean
  errors?: string[]
  violations?: Validation[]
}
