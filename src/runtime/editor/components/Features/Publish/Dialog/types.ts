import type { Validation } from '#blokkli/types'

export type MutationStatus = {
  id: string
  success: boolean
  errors?: string[]
  violations?: Validation[]
}
