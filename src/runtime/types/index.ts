import type { Ref, ComputedRef } from 'vue'
import type { Emitter } from 'mitt'
import type { BlokkliDomProvider } from '../helpers/domProvider'
import type { BlokkliAdapter, BlokkliAdapterContext } from './../adapter'
import type { BlokkliStorageProvider } from '../helpers/storageProvider'
import type { BlokkliTypesProvider } from '../helpers/typesProvider'
import type { BlokkliSelectionProvider } from '../helpers/selectionProvider'
import type { BlokkliKeyboardProvider } from '../helpers/keyboardProvider'
import type { BlokkliUiProvider } from '../helpers/uiProvider'
import type { BlokkliAnimationProvider } from '../helpers/animationProvider'
import type { BlokkliStateProvider } from '../helpers/stateProvider'
import type { eventBus } from './../helpers/eventBus'
import type { BlokkliDefinitionOption } from './blokkOptions'
import type { BlokkliTextProvider } from '../helpers/textProvider'

interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

export type BlokkliFeature = {
  id: string
  componentPath: string
}

export type MutateWithLoadingStateFunction = (
  promise: Promise<MutationResponseLike<any>> | undefined,
  errorMessage?: string,
  successMessage?: string,
) => Promise<boolean>

export type BlokkliItemDefinitionOptionsInput = {
  [key: string]: BlokkliDefinitionOption
}

export type BlokkliItemDefinitionInput<V, T = []> = {
  /**
   * The type ID of the item, e.g. "text" or "section_title".
   */
  bundle: string

  /**
   * The name of the chunk group.
   *
   * If this value is set, the component will be assigned to this
   * import chunk. Multiple components can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: V

  /**
   * Define options available for this blokkli.
   */
  options?: BlokkliItemDefinitionOptionsInput

  /**
   * Global options to use.
   *
   * These options will be merged with the component-specific options.
   */
  globalOptions?: T

  /**
   * Disable editing. This should be set if the component doesn't have any
   * fields that can be edited.
   */
  disableEdit?: boolean

  /**
   * If set, this width is used during editing when a clone or ghost of the
   * component is being displayed. Additionally, the width is used in the
   * library pane to properly scale the element in the limited amount of space.
   */
  editWidth?: number

  /**
   * When set to true, adding a new block of this type will not open the add
   * form but add it immediately. This should only be used if the block
   * itself provides default values (like "lorem ipsum" text).
   */
  noAddForm?: boolean

  /**
   * When set to true the preview in the library is not rendered.
   *
   * This should be used for complex components that render things like sliders,
   * iframes, modals, etc.
   */
  noLibraryPreview?: boolean

  /**
   * A background color class that is applied during editing when the component
   * is being displayed standalone.
   */
  editBackgroundClass?: string

  /**
   * Define a custom title for this blokkli item at runtime in the editor.
   *
   * The title will be displayed to the editor to give some context. E.g. a
   * title block displays an excerpt from the title.
   *
   * If a method is provided, it receives the root element of this component
   * and should return a fitting title.
   *
   * If no method is defined or it doesn't return a value, the regular label
   * of the blokkli type (e.g. "Teaser") is displayed.
   */
  editTitle?: (el: HTMLElement) => string | undefined

  /**
   * Build mock props for this component used for previewing on hover or in
   * the clipboard preview.
   */
  mockProps?: (text?: string) => any
}

export type InjectedBlokkliItem = ComputedRef<{
  index: ComputedRef<number>
  uuid: string
  options?: Record<string, string> | undefined
  isEditing: boolean
  parentType?: string
}>

export interface BlokkliFieldListItem {
  uuid: string
  bundle: string
  isNew?: boolean
  options?: Record<string, string>
  props?: any
}

export type BlokkliMutatedField = {
  name: string
  entityType: string
  entityUuid: string
  list: BlokkliFieldListItem[]
}

export type BlokkliEntityContext = {
  uuid: string
  type: string
  bundle: string
}

export type BlokkliEditEntity = {
  id?: string
  label?: string
  changed?: number
  status?: boolean
  bundleLabel?: string
  editUrl?: string
}

export interface BlokkliLanguage {
  id?: string
  name: string
}

export interface BlokkliEntityTranslation {
  id: string
  url: string
  status: boolean
}

export interface BlokkliTranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: BlokkliLanguage[]
  translations?: BlokkliEntityTranslation[]
}

export interface BlokkliConversionItem {
  sourceBundle: string
  targetBundle: string
}

export interface BlokkliTransformPlugin {
  /**
   * The ID of the plugin.
   */
  id: string

  /**
   * The label of the transform plugin which is shown in the editor.
   */
  label: string

  /**
   * The array of bundles for which this transform plugin is available.
   */
  bundles: string[]

  /**
   * The array of bundles that the transform might create.
   */
  targetBundles: string[]

  /**
   * The minimum number of items required.
   */
  min: number

  /**
   * The maximum number of items.
   */
  max: number
}

export interface BlokkliLibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: BlokkliFieldListItem
}

export interface BlokkliAvailableType {
  entityType: string
  bundle: string
  fieldName: string
  allowedTypes?: string[]
}

export interface BlokkliImportItem {
  uuid: string
  label: string
}

export type BlokkliComment = {
  uuid: string
  itemUuids: string[]
  resolved: boolean
  body: string
  created: string
  user: { label: string }
}

export interface BlokkliMutationItem {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedItemUuid?: string }
}

export interface BlokkliValidation {
  message: string
  code?: string
  propertyPath?: string
}

export interface BlokkliMappedState {
  currentIndex: number
  mutations: BlokkliMutationItem[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    mutatedOptions?: any
    fields?: BlokkliMutatedField[]
    violations?: BlokkliValidation[]
  }
  entity: BlokkliEditEntity
  translationState: BlokkliTranslationState
  previewUrl?: string
}

export interface BlokkliItemType {
  id: string
  label: string
  description?: string
  allowReusable?: boolean
  isTranslatable?: boolean
}

export type BlokkliEditMode = 'readonly' | 'editing' | 'translating'

export type MutatedOptions = {
  [uuid: string]: {
    [key: string]: string
  }
}

/**
 * Defines a content search item.
 */
export type BlokkliSearchContentItem = {
  /**
   * The ID of the item.
   */
  id: string

  /**
   * The title displayed to the user.
   */
  title: string

  /**
   * Additional context displayed alongside the title.
   */
  context?: string

  /**
   * The text displayed to the user.
   */
  text: string

  /**
   * The possible blokkli types for which a blokkli may be added using this content item.
   */
  targetBundles: string[]

  /**
   * An optional image URL that is used instead of an icon.
   */
  imageUrl?: string
}

interface ClipboardItemText {
  type: 'text'
  itemBundle: string
  data: string
  additional?: string
}

interface ClipboardItemYouTube {
  type: 'youtube'
  itemBundle: string
  data: string
  additional?: string
}

interface ClipboardItemImage {
  type: 'image'
  itemBundle: string
  data: string
  additional: string
}

interface ClipboardItemSearchContent {
  type: 'search_content'
  itemBundle: string
  data: string
  item: BlokkliSearchContentItem
  additional?: string
}

export type ClipboardItem =
  | ClipboardItemText
  | ClipboardItemYouTube
  | ClipboardItemImage
  | ClipboardItemSearchContent

export interface DraggableHostData {
  type: string
  uuid: string
  fieldName: string
}

export interface DraggableExistingBlokkliItem {
  itemType: 'existing'
  element: () => HTMLElement
  hostType: string
  hostBundle: string
  hostUuid: string
  hostFieldName: string
  itemBundle: string
  isNew: boolean
  uuid: string
  isNested: boolean

  /**
   * The bundle if this item is reusable.
   */
  reusableBundle?: string

  /**
   * The reusable UUID if this blokkli is a from_library type.
   */
  reusableUuid?: string

  /**
   * The title to use when displaying the blokkli in list.
   */
  editTitle?: string
}

export interface DraggableNewItem {
  itemType: 'new'
  element: () => HTMLElement
  itemBundle: string
}

export interface DraggableActionItem {
  itemType: 'action'
  actionType: string
  itemBundle?: string
  element: () => HTMLElement
}

export interface DraggableReusableItem {
  itemType: 'reusable'
  element: () => HTMLElement
  itemBundle: string
  libraryItemUuid: string
}

export interface DraggableClipboardItem {
  itemType: 'clipboard'
  element: () => HTMLElement
  itemBundle: string
  clipboardData: string
  additional?: string
}

export interface DraggableSearchContentItem {
  itemType: 'search_content'
  element: () => HTMLElement
  itemBundle: string
  searchItem: BlokkliSearchContentItem
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewItem
  | DraggableActionItem
  | DraggableExistingBlokkliItem
  | DraggableReusableItem
  | DraggableSearchContentItem

export type MoveBlokkliEvent = {
  afterUuid?: string
  item: DraggableExistingBlokkliItem
  host: DraggableHostData
}

export type MoveMultipleBlokkliItemsEvent = {
  afterUuid?: string
  uuids: string[]
  host: DraggableHostData
}

export type AddNewBlokkliItemEvent = {
  type: string
  item: DraggableNewItem
  host: DraggableHostData
  afterUuid?: string
}

export type AddClipboardItemEvent = {
  item: DraggableClipboardItem
  host: DraggableHostData
  afterUuid?: string
}

export type AddContentSearchItemEvent = {
  item: BlokkliSearchContentItem
  host: DraggableHostData
  bundle: string
  afterUuid?: string
}

export type AddReusableItemEvent = {
  libraryItemUuid: string
  host: DraggableHostData
  afterUuid?: string
}

export type UpdateBlokkliItemOptionEvent = {
  uuid: string
  key: string
  value: string
}

export type EditBlokkliItemEvent = {
  uuid: string
  bundle: string
}

export type UpdateMutatedFieldsEvent = {
  fields: BlokkliMutatedField[]
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
  hoveredUuid: string
  scale: number
  mouseX: number
  mouseY: number
}

export type BlokkliMessage = {
  type: 'success' | 'error'
  message: string
}

export type DraggableStartEvent = {
  items: DraggableItem[]
  coords: Coord
}

export type MakeReusableEvent = {
  label: string
  uuid: string
}

export type DetachReusableBlockEvent = {
  uuids: string[]
}

export type KeyPressedEvent = {
  code: string
  meta: boolean
  shift: boolean
  originalEvent: KeyboardEvent
}

export type TranslateBlokkliItemEvent = {
  uuid: string
  language: BlokkliLanguage
}

export type ImportFromExistingEvent = {
  sourceUuid: string
  sourceFields: string[]
}

export type ConvertBlokkliItemEvent = {
  uuid: string
  targetBundle: string
}

export type ScrollIntoViewEvent = {
  uuid: string
  center?: boolean
  immediate?: boolean
}

export type PluginMountEvent = {
  type: 'ItemDropdown'
  id: string
  isRendering: ComputedRef<boolean>
}

export type PluginUnmountEvent = {
  type: 'ItemDropdown'
  id: string
}

export type BlokkliEditableType = 'plaintext' | 'markup' | 'table' | 'frame'

export type BlokkliEditableDirectiveArgs = {
  label?: string
  name?: string
  maxlength?: number
  required?: boolean
  type?: BlokkliEditableType
}

export type EditableFieldFocusEvent = {
  fieldName: string
  block: DraggableExistingBlokkliItem
  element: HTMLElement
  args?: BlokkliEditableDirectiveArgs
}

export type BlokkliEvents = {
  select: string
  'item:edit': EditBlokkliItemEvent
  batchTranslate: undefined
  'dragging:start': DraggableStartEvent
  'dragging:end': undefined
  setActiveFieldKey: string
  addNewBlokkliItem: AddNewBlokkliItemEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: BlokkliMessage
  keyPressed: KeyPressedEvent
  editEntity: undefined
  translateEntity: string
  reloadState: undefined
  reloadEntity: undefined

  // Selection.
  'select:start': string[] | undefined
  'select:toggle': string
  'select:end': string[] | undefined
  'select:previous': undefined
  'select:next': undefined

  scrollIntoView: ScrollIntoViewEvent
  'animationFrame:before': undefined

  'state:reloaded': undefined

  'search:selectContentItem': BlokkliSearchContentItem
  addContentSearchItem: AddContentSearchItemEvent
  'option:update': UpdateBlokkliItemOptionEvent

  'plugin:mount': PluginMountEvent
  'plugin:unmount': PluginUnmountEvent

  'editable:focus': EditableFieldFocusEvent
  'editable:save': undefined

  'sidebar:close': undefined

  'action:placed': ActionPlacedEvent

  'animator:add': AnimatorAddEvent

  'ui:resized': undefined
  'add-list:change': undefined
}

export type UiResizedEvent = {
  width: number
  height: number
}

export type AnimateElementMode = 'leave' | 'enter'

export type AnimatorAddEvent = {
  id: string
  mode: AnimateElementMode
  height?: number
}

export type ActionPlacedEvent = {
  action: DraggableActionItem
  preceedingUuid?: string
  host: DraggableHostData
  field: BlokkliFieldElement
}

export type BlokkliEventBus = Emitter<BlokkliEvents>

export type BlokkliItemEditContext = {
  eventBus: BlokkliEventBus
  mutatedOptions: Ref<MutatedOptions>
}

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: BlokkliAdapter<any>

  eventBus: typeof eventBus

  runtimeConfig: {
    gridMarkup: string
    langcodeWithoutPrefix: string
    itemEntityType: string
    defaultLanguage: string
  }

  dom: BlokkliDomProvider
  storage: BlokkliStorageProvider
  types: BlokkliTypesProvider
  selection: BlokkliSelectionProvider
  keyboard: BlokkliKeyboardProvider
  ui: BlokkliUiProvider
  animation: BlokkliAnimationProvider
  state: BlokkliStateProvider
  context: ComputedRef<BlokkliAdapterContext>
  text: BlokkliTextProvider
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export type Coord = {
  x: number
  y: number
}

export type BlokkliFieldElement = {
  key: string
  name: string
  label: string
  isNested: boolean
  hostEntityType: string
  hostEntityBundle: string
  hostEntityUuid: string
  allowedBundles: string[]
  cardinality: number
  element: HTMLElement
  blockCount: number
}

export type PasteExistingBlocksEvent = {
  uuids: string[]
  host: DraggableHostData
  preceedingUuid?: string
}

export type NativeBlokkliEditableBlurEvent = CustomEvent<{
  field: string
  text: string
}>

export type UpdateFieldValueEvent = {
  uuid: string
  fieldName: string
  fieldValue: string
}

export type AssistantResultMarkup = {
  type: 'markup'
  content: string
}
export type AssistantResult = AssistantResultMarkup

export type AddListOrientation = 'horizontal' | 'vertical' | 'sidebar'

export default {}
