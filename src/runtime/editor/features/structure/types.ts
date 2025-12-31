import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

export interface DraggableExistingStructureBlock {
  itemType: 'existing_structure'
  block: RenderedFieldListItem
  element: () => HTMLElement
}

declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    existing_structure: DraggableExistingStructureBlock
  }
}
