export interface BlockBundleDefinition {
  id: string
  label: string
  description?: string
  imageUrl?: string
  allowReusable?: boolean
  isTranslatable?: boolean
  hasPublishOn?: boolean
  hasUnpublishOn?: boolean
}

export type FieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  cardinality: number
  canEdit: boolean
  allowedBundles: string[]
}

export type EntityTypeRestriction = {
  type: string
  bundles: string[]
}
