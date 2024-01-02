import type { BlockBundleDefinition } from '#blokkli/types'

export type StructureTreeItem = {
  uuid: string
  bundle: string
  type?: BlockBundleDefinition
  items?: StructureTreeItem[]
  title?: string
}

export type StructureTreeField = {
  name: string
  label: string
  items?: StructureTreeItem[]
}
