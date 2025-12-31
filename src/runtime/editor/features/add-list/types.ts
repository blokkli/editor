import type { AddAction } from '#blokkli/types'

export interface DraggableActionItem {
  itemType: 'action'
  actionType: string
  action: AddAction
  itemBundle?: string
  element: () => HTMLElement
}

export interface DraggableNewItem {
  itemType: 'new'
  element: () => HTMLElement
  itemBundle: string
}
declare module '#blokkli/editor/types/draggable' {
  interface DraggableItemTypes {
    new: DraggableNewItem
    action: DraggableActionItem
  }
}
