import type { ValidProviderTypes } from '#blokkli-build/generated-types'
import type { EntityContext } from '.'

export type EditPermission = 'view' | 'edit' | 'review' | 'delete'

export type BlokkliProviderEntityContext = EntityContext & {
  providerType: ValidProviderTypes
  language?: string
}
