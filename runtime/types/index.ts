import type { Ref } from 'vue'
import type { Emitter } from 'mitt'
import type { PbDomProvider } from '../helpers/domProvider'
import type { PbAdapter, PbAdapterContext } from '#blokkli/adapter'
import type { PbStorageProvider } from '../helpers/storageProvider'
import type { PbTypesProvider } from '../helpers/paragraphTypeProvider'
import type { PbSelectionProvider } from '../helpers/selectionProvider'
import type { PbKeyboardProvider } from '../helpers/keyboardProvider'
import type { PbUiProvider } from '../helpers/uiProvider'
import type { PbAnimationProvider } from '../helpers/animationFrame'
import type { PbStateProvider } from '../helpers/stateProvider'
import type { eventBus } from './../eventBus'

interface PbMutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

export type PbMutateWithLoadingState = (
  promise: Promise<PbMutationResponseLike<any>> | undefined,
  errorMessage?: string,
  successMessage?: string,
) => Promise<boolean>

export type PbAvailableFeatures = {
  comment: boolean
  conversion: boolean
  duplicate: boolean
  library: boolean
}

export type StringBoolean = '0' | '1'

export type ParagraphDefinitionOptionText = {
  type: 'text'
  default: string
  label: string
  inputType?: 'text' | 'number' | 'date'
}

export type ParagraphDefinitionOptionCheckbox = {
  type: 'checkbox'
  default: StringBoolean
  label: string
}

export type ParagraphDefinitionOptionCheckboxes = {
  type: 'checkboxes'
  label: string
  /**
   * The default values, separated by comma.
   */
  default: string
  options: Record<string, string>
}

export type ParagraphDefinitionOptionRadios = {
  type: 'radios'
  label: string
  default: string
  displayAs?: 'radios' | 'colors' | 'grid'
  options: Record<string, string | number[]>
}

export type ParagraphDefinitionOption =
  | ParagraphDefinitionOptionCheckbox
  | ParagraphDefinitionOptionCheckboxes
  | ParagraphDefinitionOptionRadios
  | ParagraphDefinitionOptionText

export type ParagraphDefinitionOptionsInput = {
  [key: string]: ParagraphDefinitionOption
}

export type ParagraphDefinitionInput<V, T = []> = {
  /**
   * The Drupal bundle name of the paragraph, e.g. "text" or "section_title".
   */
  bundle: string

  /**
   * The name of the chunk group to put the paragraph in.
   *
   * If this value is set, the paragraph component will be assigned to this
   * import chunk. Multiple paragraphs can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: V

  /**
   * Options available for the paragraph.
   *
   * These options are specific to this paragraph.
   */
  options?: ParagraphDefinitionOptionsInput

  /**
   * Global options to use for this paragraph.
   *
   * These options will be merged with the paragraph-specific options.
   */
  globalOptions?: T

  /**
   * Disable editing of the paragraph. This should be set if the paragraph
   * doesn't have any fields that can be edited in Drupal, except for paragraph
   * fields.
   */
  disableEdit?: boolean

  /**
   * If set, this width is used during editing when a skeleton of the
   * paragraph is being displayed. Additionally, the width is used in the
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
   * A background color class that is applied during editing when the paragraph
   * is being displayed standalone.
   */
  editBackgroundClass?: string

  /**
   * Define a custom title for this paragraph at runtime in the editor.
   *
   * The title will be displayed to the editor to give some context. E.g. a
   * title block displays an excerpt from the title.
   *
   * If a method is provided, it receives the root element of this component
   * and should return a fitting title.
   *
   * If no method is defined or it doesn't return a value, the regular label
   * of the paragraph (e.g. "Teaser") is displayed.
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

export interface PbFieldItemParagraphFragment {
  __typename: any
  id?: string
  uuid: string
  entityBundle: string
}

export interface PbFieldItemFragment<T> {
  item?: PbFieldItemParagraphFragment
  paragraph?: T
}

type PbList = PbFieldItemFragment<any>[]

export type PbMutatedField = {
  name: string
  label: string
  field: {
    list?: PbFieldItemFragment<any>[]
  }
}

export type PbEditEntityTranslation = {
  langcode: string
  url: string
  status: boolean
}

export type PbEditEntity = {
  id?: string
  label?: string
  changed?: number
  status?: boolean
  bundleLabel?: string
  editUrl?: string
}

export interface PbAvailableLanguage {
  id?: string
  name: string
}

export interface PbAvailableTranslation {
  id: string
  url: string
  status: boolean
}

export interface PbTranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: PbAvailableLanguage[]
  translations?: PbAvailableTranslation[]
}

export interface PbFieldConfig {
  name?: string
  label?: string
  storage?: {
    cardinality?: number
  }
}

export interface PbFieldEntity {
  id?: string
  entityTypeId: string
  entityBundle: string
  uuid: string
}

export interface PbConversion {
  sourceBundle: string
  targetBundle: string
}

export interface PbField {
  canEdit?: boolean
  list?: PbList
  fieldConfig?: PbFieldConfig
  entity?: PbFieldEntity
}

export interface PbLibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: PbFieldItemParagraphFragment
  paragraph: any
}

export interface PbAllowedBundle {
  entityType: string
  bundle: string
  fieldName: string
  allowedTypes?: string[]
}

export interface PbImportItem {
  uuid: string
  label: string
}

export type PbComment = {
  uuid?: string
  paragraphUuids?: string[]
  resolved?: boolean
  body?: string
  created?: { first?: { value?: string } }
  user?: { label?: string }
}

export interface PbMutation {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedParagraphUuid?: string }
}

export interface PbViolation {
  message: string
  code?: string
  propertyPath?: string
}

export interface PbEditState {
  currentIndex: number
  mutations: PbMutation[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    behaviorSettings?: any
    fields?: PbMutatedField[]
    violations?: PbViolation[]
  }
  entity: PbEditEntity
  translationState: PbTranslationState
  previewUrl?: string
}

export interface PbType {
  id?: string
  label?: string
  description?: string
  allowReusable?: boolean
  icon?: string
  isTranslatable?: boolean
}

export type PbEditMode = 'readonly' | 'editing' | 'translating'

export interface PbSettings {
  showImport: boolean | undefined
  persistCanvas: boolean | undefined
}

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
export type PbSearchContentItem = {
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
   * The possible paragraph bundles for which a paragraph may be added for this content item.
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
   * The paragraph bundle if this item is reusable.
   */
  reusableBundle?: string

  /**
   * The reusable paragraph UUID if this paragraph is a from_library type.
   */
  reusableUuid?: string

  /**
   * The title to use when displaying the paragraph in an abstract way.
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
  searchItem: PbSearchContentItem
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

export type AddContentSearchItemParagraphEvent = {
  item: PbSearchContentItem
  host: DraggableHostData
  bundle: string
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

export type TranslateParagraphEvent = {
  uuid: string
  language: PbAvailableLanguage
}

export type ImportFromExistingEvent = {
  sourceUuid: string
  sourceFields: string[]
}

export type ParagraphConvertEvent = {
  uuid: string
  targetBundle: string
}

export type ParagraphScrollIntoViewEvent = {
  uuid: string
  center?: boolean
  immediate?: boolean
}

export type ParagraphsBuilderEvents = {
  select: string
  editParagraph: EditParagraphEvent
  translateParagraph: TranslateParagraphEvent
  batchTranslate: undefined
  removeGhosts: undefined
  'dragging:start': DraggableStartEvent
  'dragging:end': undefined
  setActiveFieldKey: string
  moveParagraph: MoveParagraphEvent
  moveMultipleParagraphs: MoveMultipleParagraphsEvent
  addNewParagraph: AddNewParagraphEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: PbMessage
  keyPressed: KeyPressedEvent
  editEntity: undefined
  translateEntity: string
  reloadState: undefined
  reloadEntity: undefined
  updateParagraphOptions: UpdateParagraphOptionEvent[]
  duplicateParagraph: string
  deleteParagraph: string

  // Selection.
  'select:start': undefined
  'select:toggle': string
  'select:end': string[]

  'paragraph:convert': ParagraphConvertEvent

  'paragraph:scrollIntoView': ParagraphScrollIntoViewEvent
  'animationFrame:before': undefined

  'state:reloaded': undefined

  'search:selectContentItem': PbSearchContentItem
  addContentSearchItemParagraph: AddContentSearchItemParagraphEvent
  'option:update': UpdateParagraphOptionEvent
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
  adapter: PbAdapter<any>

  eventBus: typeof eventBus

  runtimeConfig: {
    disableLibrary: boolean
    gridMarkup: string
    langcodeWithoutPrefix: string
  }

  dom: PbDomProvider
  storage: PbStorageProvider
  types: PbTypesProvider
  selection: PbSelectionProvider
  keyboard: PbKeyboardProvider
  ui: PbUiProvider
  animation: PbAnimationProvider
  state: PbStateProvider
  context: ComputedRef<PbAdapterContext>
}

export default {}
