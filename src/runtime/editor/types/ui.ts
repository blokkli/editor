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
  zIndex?: 'default' | 'high'
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

/**
 * What the editor asked before a drop onto a drop area.
 */
export type DropAreaDropOptions = {
  /**
   * The answer to `askLanguages`: true to change the field in every language,
   * false for the source language only. Not set when the editor didn't ask.
   */
  allLanguages?: boolean
}

export type DropArea = {
  id: string
  label: string
  icon?: BlokkliIcon
  element: HTMLElement

  /**
   * Whether to ask after the drop if the field changes in every language or
   * only in the source language. Closing the question cancels the drop.
   */
  askLanguages?: boolean
  onDrop: (options: DropAreaDropOptions) => Promise<any> | any
}

export type InteractionMode = 'mouse' | 'touch'

export type BlockIndicator = {
  id: string
  uuid: string
  element: HTMLElement
  position: 'left' | 'right'
  sticky?: boolean
}

export type Placement =
  | 'above-before'
  | 'above-left'
  | 'above-center'
  | 'above-right'
  | 'above-after'
  | 'below-before'
  | 'below-left'
  | 'below-center'
  | 'below-right'
  | 'below-after'
  | 'top-before'
  | 'top-after'
  | 'center-before'
  | 'center-after'
  | 'bottom-before'
  | 'bottom-after'
