import type { RenderedFieldListItem } from './field'

export interface DraggableExistingBlock {
  itemType: 'existing'
  block: RenderedFieldListItem
}

export interface DraggableItemTypes {
  existing: DraggableExistingBlock
}

export type DraggableItem = DraggableItemTypes[keyof DraggableItemTypes]
