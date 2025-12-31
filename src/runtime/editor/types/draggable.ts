import type { RenderedFieldListItem } from '#blokkli/types'

export interface DraggableExistingBlock {
  itemType: 'existing'
  block: RenderedFieldListItem
}

export interface DraggableItemTypes {
  existing: DraggableExistingBlock
}

export type DraggableItem = DraggableItemTypes[keyof DraggableItemTypes]
