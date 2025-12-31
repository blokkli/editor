import type { EntityContext } from '.'

export type EditPermission = 'view' | 'edit' | 'review'

export type BlokkliProviderEntityContext = EntityContext & {
  language?: string
}
