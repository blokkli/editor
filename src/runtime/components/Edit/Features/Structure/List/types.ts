import type { BlokkliItemType } from '#blokkli/types'

export type StructureTreeItem = {
  uuid: string
  bundle: string
  type?: BlokkliItemType
  items?: StructureTreeItem[]
  title?: string
}

export type StructureTreeField = {
  name: string
  label: string
  items?: StructureTreeItem[]
}
