export interface BlockBundleDefinition {
  id: string
  label: string
  description?: string
  allowReusable?: boolean
  isTranslatable?: boolean
  hasPublishOn?: boolean
  hasUnpublishOn?: boolean
}
