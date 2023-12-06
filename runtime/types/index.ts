import type { Ref } from 'vue'
import type { Emitter } from 'mitt'
import type { BlokkliDomProvider } from '../helpers/domProvider'
import type { BlokkliAdapter, BlokkliAdapterContext } from '#blokkli/adapter'
import type { BlokkliStorageProvider } from '../helpers/storageProvider'
import type { BlokkliTypesProvider } from '../helpers/paragraphTypeProvider'
import type { BlokkliSelectionProvider } from '../helpers/selectionProvider'
import type { BlokkliKeyboardProvider } from '../helpers/keyboardProvider'
import type { BlokkliUiProvider } from '../helpers/uiProvider'
import type { BlokkliAnimationProvider } from '../helpers/animationFrame'
import type { BlokkliStateProvider } from '../helpers/stateProvider'
import type { eventBus } from './../eventBus'
import type { ParagraphDefinitionOption } from './blokkOptions'

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

export type MutateWithLoadingStateFunction = (
  promise: Promise<MutationResponseLike<any>> | undefined,
  errorMessage?: string,
  successMessage?: string,
) => Promise<boolean>

export type BlokkliAvailableFeatures = {
  comment: boolean
  conversion: boolean
  duplicate: boolean
  library: boolean
}

export type BlokkliItemDefinitionOptionsInput = {
  [key: string]: ParagraphDefinitionOption
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

export type InjectedParagraphItem = ComputedRef<{
  index: ComputedRef<number>
  uuid: string
  paragraphsBuilderOptions: Record<string, string> | undefined
  isEditing: boolean
  parentParagraphBundle?: string
}>

export interface BlokkliFieldListItemParagraph {
  __typename: any
  id?: string
  uuid: string
  entityBundle: string
}

export interface BlokkliFieldList<T> {
  item?: BlokkliFieldListItemParagraph
  paragraph?: T
}

export type BlokkliMutatedField = {
  name: string
  label: string
  field: {
    list?: BlokkliFieldList<any>[]
  }
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

export interface BlokkliFieldListConfig {
  name?: string
  label?: string
  storage?: {
    cardinality?: number
  }
}

export interface BlokkliFieldListEntity {
  id?: string
  entityTypeId: string
  entityBundle: string
  uuid: string
}

export interface BlokkliConversionItem {
  sourceBundle: string
  targetBundle: string
}

export interface BlokkliLibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: BlokkliFieldListItemParagraph
  paragraph: any
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
  uuid?: string
  paragraphUuids?: string[]
  resolved?: boolean
  body?: string
  created?: { first?: { value?: string } }
  user?: { label?: string }
}

export interface BlokkliMutationItem {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedParagraphUuid?: string }
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
    behaviorSettings?: any
    fields?: BlokkliMutatedField[]
    violations?: BlokkliValidation[]
  }
  entity: BlokkliEditEntity
  translationState: BlokkliTranslationState
  previewUrl?: string
}

export interface BlokkliItemType {
  id?: string
  label?: string
  description?: string
  allowReusable?: boolean
  icon?: string
  isTranslatable?: boolean
}

export type BlokkliEditMode = 'readonly' | 'editing' | 'translating'

export type MutatedParagraphOptions = {
  [uuid: string]: {
    [pluginId: string]: {
      [key: string]: string
    }
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
  libraryItemUuid: string
}

export interface DraggableClipboardItem {
  itemType: 'clipboard'
  element: HTMLElement
  paragraphType: string
  clipboardData: string
  additional?: string
}

export interface DraggableSearchContentItem {
  itemType: 'search_content'
  element: HTMLElement
  paragraphType: string
  searchItem: BlokkliSearchContentItem
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewParagraphItem
  | DraggableExistingParagraphItem
  | DraggableReusableParagraphItem
  | DraggableMultipleExistingParagraphItem
  | DraggableSearchContentItem

export interface ParagraphOptionsOverride {
  uuid: Ref<string>
  options: Ref<Record<string, any>>
}

export type MoveBlokkliEvent = {
  afterUuid?: string
  item: DraggableExistingParagraphItem
  host: DraggableHostData
}

export type MoveMultipleBlokkliItemsEvent = {
  afterUuid?: string
  uuids: string[]
  host: DraggableHostData
}

export type AddNewBlokkliItemEvent = {
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

export type AddContentSearchItemParagraphEvent = {
  item: BlokkliSearchContentItem
  host: DraggableHostData
  bundle: string
  afterUuid?: string
}

export type AddReusableParagraphEvent = {
  item: DraggableReusableParagraphItem
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
  scale: number
  mouseX: number
  mouseY: number
}

export type BlokkliMessage = {
  type: 'success' | 'error'
  message: string
}

export type DraggableStartEvent = {
  rect: DOMRect
  offsetX: number
  offsetY: number
}

export type MakeReusableEvent = {
  label: string
  uuid: string
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

export type ParagraphsBuilderEvents = {
  select: string
  editParagraph: EditBlokkliItemEvent
  translateParagraph: TranslateBlokkliItemEvent
  batchTranslate: undefined
  removeGhosts: undefined
  'dragging:start': DraggableStartEvent
  'dragging:end': undefined
  setActiveFieldKey: string
  moveParagraph: MoveBlokkliEvent
  moveMultipleParagraphs: MoveMultipleBlokkliItemsEvent
  addNewBlokkliItem: AddNewBlokkliItemEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: BlokkliMessage
  keyPressed: KeyPressedEvent
  editEntity: undefined
  translateEntity: string
  reloadState: undefined
  reloadEntity: undefined
  updateParagraphOptions: UpdateBlokkliItemOptionEvent[]
  duplicateParagraph: string
  deleteParagraph: string

  // Selection.
  'select:start': undefined
  'select:toggle': string
  'select:end': string[]

  'paragraph:convert': ConvertBlokkliItemEvent

  'scrollIntoView': ScrollIntoViewEvent
  'animationFrame:before': undefined

  'state:reloaded': undefined

  'search:selectContentItem': BlokkliSearchContentItem
  addContentSearchItemParagraph: AddContentSearchItemParagraphEvent
  'option:update': UpdateBlokkliItemOptionEvent
}

export type ParagraphsBuilderEventBus = Emitter<ParagraphsBuilderEvents>

export type ParagraphsBuilderEditContext = {
  eventBus: ParagraphsBuilderEventBus
  mutatedOptions: Ref<MutatedParagraphOptions>
}

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: BlokkliAdapter<any>

  eventBus: typeof eventBus

  runtimeConfig: {
    disableLibrary: boolean
    gridMarkup: string
    langcodeWithoutPrefix: string
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
}

export default {}
