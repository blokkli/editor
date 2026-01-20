import type { EntityContext } from '.'

export type EditPermission = 'view' | 'edit' | 'review' | 'delete'

export type BlokkliProviderEntityContext = EntityContext & {
  language?: string
}
