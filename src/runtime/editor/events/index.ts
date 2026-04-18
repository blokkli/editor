import mitt, { type Emitter } from 'mitt'
import type { UpdateBlockOptionEvent } from '../features/options/types'
import type { Coord, Size } from '../types/geometry'
import type { MutatedField } from '../types/state'
import type { DraggableExistingBlock, DraggableItem } from '../types/draggable'
import type { InteractionMode, Message } from '../types/ui'
import type {
  BlokkliFieldElement,
  BlokkliItemHost,
  RenderedFieldListItem,
} from '../types/field'

export type SelectStartEvent = {
  uuids: string[]
  mode: InteractionMode
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

export type DroppableFieldOpenEvent = {
  fieldName: string
  uuid: string
  entityType: string
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
  host: BlokkliItemHost
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
  host: BlokkliItemHost
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
  host: BlokkliItemHost
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
  host: BlokkliItemHost
}

export type AddNewBlockEvent = {
  bundle: string
  host: BlokkliItemHost
  afterUuid: string | null
  /** Optional UUID to use for the new block. If not provided, the adapter generates one. */
  blockUuid?: string
}

export type BlockFieldValue = {
  fieldName: string
  fieldValue: string | { entityType: string; entityId: string }
}

export type AddNewBlocksEventBlock = {
  bundle: string
  /** UUID for the new block. */
  blockUuid: string
  /** Optional default values for the block's editable/droppable fields. */
  values?: BlockFieldValue[]
  /** Storable option values for this block. */
  options?: Record<string, string>
  /** Nested child blocks keyed by block field name. */
  children?: Record<string, AddNewBlocksEventBlock[]>
}

export type AddNewBlocksEvent = {
  blocks: AddNewBlocksEventBlock[]
  host: BlokkliItemHost
  afterUuid: string | null
}

export type UpdateMutatedFieldsEvent = {
  fields: MutatedField[]
}

type MultiSelectStartEvent = {
  x: number
  y: number
}

export type DraggableStartEvent = {
  items: DraggableItem[]
  coords: Coord
  mode: InteractionMode
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: BlokkliItemHost
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

export type ScrollSelectionIntoViewEvent = {
  center?: boolean
  immediate?: boolean
}

export interface EventbusEvents {
  select: string | string[]
  'select:unselect': undefined
  'select:force': string | string[]
  'select:host': undefined
  'select:host:unselect': undefined
  'multi-select:start': MultiSelectStartEvent
  'dragging:start': DraggableStartEvent
  'dragging:drop': DropTargetEvent
  'dragging:move': Coord
  'dragging:end': undefined
  'add:block:new': AddNewBlockEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: Message
  keyPressed: KeyPressedEvent
  editEntity: undefined
  reloadState: undefined
  reloadEntity: (() => void) | undefined

  // Selection.
  'select:start': SelectStartEvent
  'select:toggle': string
  'select:shiftToggle': string
  'select:end': string[] | undefined
  'select:next': string[] | undefined
  'select:prev': string[] | undefined
  'overlay:close': undefined

  // Add action dropped.
  'item:dropped': undefined
  'block:append': BlockAppendEvent

  'item:doubleClick': RenderedFieldListItem

  scrollIntoView: ScrollIntoViewEvent
  scrollSelectionIntoView: ScrollSelectionIntoViewEvent
  highlight: HTMLElement | null
  'animationFrame:before': AnimationFrameBeforeEvent
  'animationFrame:after': undefined
  'canvas:draw': CanvasDrawEvent

  'state:reload:before': undefined
  'state:reloaded': undefined

  'option:update': UpdateBlockOptionEvent

  /**
   * Emitted when editing a complex option type (e.g. chart data).
   */
  'option:edit-complex': { uuid: string; key: string; dataType: string }

  /**
   * Emitted after finishing changing options.
   */
  'option:finish-change': undefined

  'plugin:mount': PluginMountEvent
  'plugin:unmount': PluginUnmountEvent

  'editable:open': EditableFieldFocusEvent
  'editable:focus': EditableFieldFocusEvent
  'editable:update': EditableFieldUpdateEvent
  'editable:save': undefined

  'droppable:open': DroppableFieldOpenEvent

  'drop:clipboardItem': DropClipboardItemEvent

  'sidebar:close': undefined
  'sidebar:open': string

  'action:selected': undefined

  'animator:add': AnimatorAddEvent

  'ui:resized': undefined
  'ui:update-rects': undefined
  'add-list:change': undefined
  'window:clickAway': undefined

  'mouse:down': GlobalPointerEvent
  'mouse:move': GlobalPointerEvent
  'mouse:up': GlobalPointerUpEvent

  /**
   * Emitted when a view option is being toggled.
   */
  'view-option:toggle': { id: string }

  /**
   * Emitted when editing a fragment provided by a feature.
   */
  'fragment:edit': { name: string; uuid: string }

  'block:rerender': string[]

  'analyze:ignore': { resultId: string; identifier: string }
  'analyze:unignore': { resultId: string; identifier: string }
}

type EventbusEventsType = {
  [K in keyof EventbusEvents]: EventbusEvents[K]
}

export const eventBus = mitt<EventbusEventsType>()

export type Eventbus = Emitter<EventbusEventsType>

export type BlokkliEventBus = Emitter<EventbusEventsType>

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
