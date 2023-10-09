import type { Ref } from 'vue'
import type { Emitter } from 'mitt'
import { PbMutatedField } from '../../types'

export interface DraggableHostData {
  type: string
  uuid: string
  fieldName: string
}

export interface DraggableExistingParagraphItem {
  itemType: 'existing'
  element: HTMLElement
  hostType: string
  hostBundle: string
  hostUuid: string
  hostFieldName: string
  paragraphType: string
  uuid: string
  /**
   * The paragraph bundle if this item is reusable.
   */
  reusableBundle?: string

  /**
   * The reusable paragraph UUID if this paragraph is a from_library type.
   */
  reusableUuid?: string
}

export interface DraggableMultipleExistingParagraphItem {
  itemType: 'multiple_existing'
  uuids: string[]
  bundles: string[]
}

export interface DraggableNewParagraphItem {
  itemType: 'new'
  element: HTMLElement
  paragraphType: string
}

export interface DraggableReusableParagraphItem {
  itemType: 'reusable'
  element: HTMLElement
  paragraphBundle: string
  libraryItemId: string
}

export interface DraggableClipboardItem {
  itemType: 'clipboard'
  element: HTMLElement
  paragraphType: string
  clipboardData: string
  additional?: string
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewParagraphItem
  | DraggableExistingParagraphItem
  | DraggableReusableParagraphItem
  | DraggableMultipleExistingParagraphItem

export type MoveParagraphEvent = {
  afterUuid?: string
  item: DraggableExistingParagraphItem
  host: DraggableHostData
}

export type MoveMultipleParagraphsEvent = {
  afterUuid?: string
  uuids: string[]
  host: DraggableHostData
}

export type AddNewParagraphEvent = {
  type: string
  item: DraggableNewParagraphItem
  host: DraggableHostData
  afterUuid?: string
}

export type AddClipboardParagraphEvent = {
  item: DraggableClipboardItem
  host: DraggableHostData
  afterUuid?: string
}

export type AddReusableParagraphEvent = {
  item: DraggableReusableParagraphItem
  host: DraggableHostData
  afterUuid?: string
}

export type UpdateParagraphOptionEvent = {
  uuid: string
  key: string
  value: string
}

export type EditParagraphEvent = {
  uuid: string
  bundle: string
}

export type UpdateMutatedFieldsEvent = {
  fields: PbMutatedField[]
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
  rects: Record<string, DOMRect>
  rootRect: DOMRect
  canvasRect: DOMRect
  fieldAreas: AnimationFrameFieldArea[]
  scale: number
  mouseX: number
  mouseY: number
}

export type PbMessage = {
  type: 'success' | 'error'
  message: string
}

export type DraggableStartEvent = {
  rect: DOMRect
  offsetX: number
  offsetY: number
}

export type ParagraphsBuilderEvents = {
  select: DraggableExistingParagraphItem
  selectAdditional: DraggableExistingParagraphItem
  editParagraph: EditParagraphEvent
  removeGhosts: undefined
  draggingStart: DraggableStartEvent
  draggingEnd: undefined
  moveParagraph: MoveParagraphEvent
  moveMultipleParagraphs: MoveMultipleParagraphsEvent
  addNewParagraph: AddNewParagraphEvent
  addReusableParagraph: AddReusableParagraphEvent
  addClipboardParagraph: AddClipboardParagraphEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: PbMessage
}

export type ParagraphsBuilderEventBus = Emitter<ParagraphsBuilderEvents>

export type ParagraphsBuilderEditContext = {
  eventBus: ParagraphsBuilderEventBus
  mutatedParagraphOptions: MutatedParagraphOptions
}

export interface ParagraphOptionsOverride {
  uuid: Ref<string>
  options: Ref<Record<string, any>>
}

export type MutatedParagraphOptions = {
  [uuid: string]: {
    [pluginId: string]: {
      [key: string]: string
    }
  }
}

export default {}
