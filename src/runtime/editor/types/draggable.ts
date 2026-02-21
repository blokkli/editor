import type { RenderedFieldListItem } from './field'

export interface DraggableExistingBlock {
  itemType: 'existing'
  block: RenderedFieldListItem
  isCopy?: boolean
}

export interface DraggableItemTypes {
  existing: DraggableExistingBlock
}

export type DraggableItem = DraggableItemTypes[keyof DraggableItemTypes]
