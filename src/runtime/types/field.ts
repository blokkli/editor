export type FieldDropAlignment = 'vertical' | 'horizontal'

export type BlockEditContext = {
  isPublished: boolean
  isNew: boolean
  publishOn?: string | null
  unpublishOn?: string | null
}

export type FieldListItem = {
  uuid: string
  bundle: string
  isVisible: boolean
  options?: Record<string, any>
  editContext?: BlockEditContext
  props?: Record<string, any>
}
