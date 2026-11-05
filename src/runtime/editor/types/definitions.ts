export type BlockPermission = 'add' | 'delete' | 'edit'

export interface BlockBundleDefinition {
  id: string
  label: string
  description?: string
  imageUrl?: string
  allowReusable?: boolean
  isTranslatable?: boolean
  hasPublishOn?: boolean
  hasUnpublishOn?: boolean
  permissions: BlockPermission[]
}

export type FieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  cardinality: number

  /**
   * Whether blökkli manages the field. If not, the editor shows what the field
   * holds, as stored, outside the edit state.
   */
  canEdit: boolean
  allowedBundles: string[]

  /**
   * The user may not change what the field holds. Unlike a field that blökkli
   * doesn't manage, it shows the edit state: but nothing is added to it, moved
   * into, out of or within it, or removed from it, and nothing in it changes.
   */
  readOnly?: boolean
}

export type EntityTypeRestriction = {
  type: string
  bundles: string[]
}

export type EntityTypeInfo = {
  id: string
  label: string
}

export type EntityTypeBundleInfo = {
  id: string
  label: string
}
