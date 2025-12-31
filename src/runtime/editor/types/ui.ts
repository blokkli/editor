import type { BlokkliIcon } from '#blokkli-build/icons'

export type Message = {
  type: 'success' | 'error' | 'warning'
  message: string
  additional?: string | Error | unknown
  replace?: boolean
}

export type SidebarRegion = 'left' | 'right'

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
