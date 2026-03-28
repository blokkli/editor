import type { BlokkliIcon } from '#blokkli-build/icons'

export type UiStatus = 'success' | 'warning' | 'error'

export type Message = {
  type: UiStatus
  message: string
  additional?: string | Error | unknown
  replace?: boolean
}

export type SidebarRegion = 'left' | 'right' | 'right-bottom'

export type GlobalUiDialog = {
  id: string
  alignment: 'left' | 'right' | 'center'
  confirmClose?: boolean
}

export type ContextMenuRule = {
  type: 'rule'
}

export type ContextMenuButton = {
  type: 'button'
  label: string
  icon: BlokkliIcon
  callback: () => void
}

export type ContextMenu = ContextMenuButton | ContextMenuRule

export type KeyboardShortcut = {
  group?: string
  meta?: boolean
  shift?: boolean
  code: string
  label: string
}

export type DropArea = {
  id: string
  label: string
  icon?: BlokkliIcon
  element: HTMLElement
  onDrop: () => Promise<any> | any
}

export type InteractionMode = 'mouse' | 'touch'

export type BlockIndicator = {
  id: string
  uuid: string
  element: HTMLElement
  position: 'left' | 'right'
}
