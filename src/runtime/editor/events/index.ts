import mitt, { type Emitter } from 'mitt'
import type {
  BlokkliFieldElement,
  ClipboardItem,
  Coord,
  DraggableExistingBlock,
  DraggableHostData,
  DraggableItem,
  EntityTranslation,
  InteractionMode,
  Language,
  Message,
  MutatedField,
  RenderedFieldListItem,
  Size,
} from '#blokkli/types'
import type { UpdateBlockOptionEvent } from '../features/options/types'
import type { LibraryEditItemEvent } from '../features/library/types'

export type SelectStartEvent = {
  uuids: string[]
  mode: InteractionMode
}

export type TranslateBlockEvent = {
  uuid: string
  language: Language
}

export type ConvertBlockEvent = {
  uuid: string
  targetBundle: string
}

export type ScrollIntoViewEvent =
  | {
      uuid: string
      center?: boolean
      immediate?: boolean
    }
  | {
      element: HTMLElement
      center?: boolean
      immediate?: boolean
      highlight?: boolean
    }

export type KeyPressedEvent = {
  code: string
  meta: boolean
  shift: boolean
  originalEvent: KeyboardEvent
}

export type PluginMountEvent = {
  type: 'ItemDropdown'
  id: string
}

export type PluginUnmountEvent = {
  type: 'ItemDropdown'
  id: string
}

export type EditableFieldFocusEvent = {
  fieldName: string
  uuid?: string
}

export type EditableFieldUpdateEvent = {
  name: string
  entityUuid: string
  value: string
}

export type UiResizedEvent = {
  width: number
  height: number
}

export type AnimateElementMode = 'leave' | 'enter'

export type BlockAppendEvent = {
  bundle: string
  host: DraggableHostData
  afterUuid: string | null
}

export type CanvasDrawEvent = {
  mouseX: number
  mouseY: number
  mouseArtboard: Coord
  artboardOffset: Coord
  artboardScale: number
  artboardSize: Size
  time: number
  selectedUuids: string[]
  dpi: number
}

export type DropClipboardItemEvent = {
  id: string
  blockBundle: string
  host: DraggableHostData
  afterUuid: string | null
}

export type AnimatorAddEvent = {
  id: string
  mode: AnimateElementMode
  height?: number
}

export type MoveBlockEvent = {
  afterUuid: string | null
  item: DraggableExistingBlock
  host: DraggableHostData
}

type AnimationFrameFieldArea = {
  key: string
  name: string
  label: string
  isNested: boolean
  rect: DOMRect
  isVisible: boolean
}

export type AnimationFrameEvent = {
  fieldAreas: AnimationFrameFieldArea[]
  mouseX: number
  mouseY: number
  time: number
}

export type AnimationFrameBeforeEvent = {
  time: number
  mouseX: number
  mouseY: number
}

export type MoveMultipleBlocksEvent = {
  afterUuid: string | null
  uuids: string[]
  host: DraggableHostData
}

export type AddNewBlockEvent = {
  bundle: string
  host: DraggableHostData
  afterUuid: string | null
}

export type AddClipboardItemEvent = {
  item: ClipboardItem
  blockBundle: string
  host: DraggableHostData
  afterUuid: string | null
}

export type UpdateMutatedFieldsEvent = {
  fields: MutatedField[]
}

type MultiSelectStartEvent = {
  x: number
  y: number
}

export type EditBlockEvent = {
  uuid: string
  bundle: string
}

export type DraggableStartEvent = {
  items: DraggableItem[]
  coords: Coord
  mode: InteractionMode
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid: string | null
}

export type GlobalPointerEvent = {
  /**
   * The interaction mode.
   */
  type: InteractionMode

  /**
   * The viewport relative x coordinate.
   */
  x: number

  /**
   * The viewport relative y coordinate.
   */
  y: number

  /**
   * The total distance travelled.
   */
  distance: number
}

export type GlobalPointerUpEvent = GlobalPointerEvent & {
  /**
   * The total duration in miliseconds from the first click or touch to
   * the last click or touch.
   */
  duration: number
}

export type EventbusEvents = {
  select: string | string[]
  'select:unselect': undefined
  'select:force': string | string[]
  'select:host': undefined
  'select:host:unselect': undefined
  'multi-select:start': MultiSelectStartEvent
  'item:edit': EditBlockEvent
  batchTranslate: undefined
  'dragging:start': DraggableStartEvent
  'dragging:drop': DropTargetEvent
  'dragging:end': undefined
  'add:block:new': AddNewBlockEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: Message
  keyPressed: KeyPressedEvent
  editEntity: undefined
  translateEntity: EntityTranslation
  reloadState: undefined
  reloadEntity: (() => void) | undefined
  'entity:translated': string

  // Selection.
  'select:start': SelectStartEvent
  'select:toggle': string
  'select:shiftToggle': string
  'select:end': string[] | undefined
  'overlay:close': undefined

  // Add action dropped.
  'item:dropped': undefined
  'block:append': BlockAppendEvent

  'item:doubleClick': RenderedFieldListItem

  scrollIntoView: ScrollIntoViewEvent
  'animationFrame:before': AnimationFrameBeforeEvent
  'animationFrame:after': undefined
  'canvas:draw': CanvasDrawEvent

  'state:reload:before': undefined
  'state:reloaded': undefined

  'option:update': UpdateBlockOptionEvent

  /**
   * Emitted after finishing changing options.
   */
  'option:finish-change': undefined

  'plugin:mount': PluginMountEvent
  'plugin:unmount': PluginUnmountEvent

  'editable:focus': EditableFieldFocusEvent
  'editable:update': EditableFieldUpdateEvent
  'editable:save': undefined

  'drop:clipboardItem': DropClipboardItemEvent

  'sidebar:close': undefined
  'sidebar:open': string

  'action:selected': undefined

  'animator:add': AnimatorAddEvent

  'ui:resized': undefined
  'add-list:change': undefined
  'window:clickAway': undefined

  'mouse:down': GlobalPointerEvent
  'mouse:move': GlobalPointerEvent
  'mouse:up': GlobalPointerUpEvent

  /**
   * Emitted when publishing failed.
   */
  'publish:failed': undefined

  /**
   * Show the publish dialog.
   */
  'publish:show-dialog': undefined

  /**
   * Edit a library item.
   */
  'library:edit-item': LibraryEditItemEvent

  /**
   * Emitted when a view option is being toggled.
   */
  'view-option:toggle': { id: string }

  /**
   * An analyze node target was clicked.
   */
  'analyze:click-node': { id: string; target: HTMLElement }
}

export const eventBus = mitt<EventbusEvents>()

export type Eventbus = Emitter<EventbusEvents>

export type BlokkliEventBus = Emitter<EventbusEvents>

export const emitMessage = (
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
  additional?: string | Error | unknown,
  replace?: boolean,
) => {
  eventBus.emit('message', { type, message, additional, replace })
}

type FrameEventBusEvents = {
  selectItems: string[]
  mutatedFields: MutatedField[]
  focus: string
  updateOption: UpdateBlockOptionEvent
}

export const frameEventBus = mitt<FrameEventBusEvents>()
