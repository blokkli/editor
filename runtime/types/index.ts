import type { Ref } from 'vue'
import type { Emitter } from 'mitt'

import { WritableComputedRef } from 'nuxt/dist/app/compat/capi'
import { eventBus } from './../eventBus'
import { PbAdapter } from './adapter'
import { PbDomProvider } from '../helpers/domProvider'

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

export interface PbStore {
  /**
   * Perform a mutation with a loading state.
   */
  mutateWithLoadingState: PbMutateWithLoadingState

  /**
   * The adapter.
   */
  adapter: PbAdapter<any>

  /**
   * The entity type.
   */
  entityType: string
  entityUuid: string
  entityBundle: string
  canEdit: globalThis.ComputedRef<boolean>
  currentMutationIndex: globalThis.Ref<Readonly<number>>
  setMutationIndex: (index: number) => void

  availableFeatures: globalThis.Ref<Readonly<PbAvailableFeatures>>

  mutations: globalThis.Ref<Readonly<PbMutation[]>>

  activeSidebar: globalThis.Ref<Readonly<string>>
  toggleSidebar: (id: string) => void
  showSidebar: (id: string) => void
  allTypes: globalThis.ComputedRef<PbType[]>
  violations: globalThis.Ref<Readonly<PbViolation[]>>
  eventBus: typeof eventBus

  selectedParagraphs: globalThis.ComputedRef<DraggableExistingParagraphItem[]>

  allowedTypes: globalThis.ComputedRef<PbAllowedBundle[]>
  allowedTypesInList: globalThis.ComputedRef<string[]>
  paragraphTypesWithNested: globalThis.ComputedRef<string[]>

  runtimeConfig: {
    disableLibrary: boolean
    gridMarkup: string
    langcodeWithoutPrefix: string
  }

  activeFieldKey: globalThis.Ref<Readonly<string>>
  setActiveFieldKey: (key: string) => void

  isPressingControl: globalThis.Ref<Readonly<boolean>>
  isPressingSpace: globalThis.Ref<Readonly<boolean>>
  previewGrantUrl: globalThis.Ref<Readonly<string>>
  entity: globalThis.Readonly<globalThis.Ref<globalThis.Readonly<PbEditEntity>>>
  translationState: Readonly<globalThis.Ref<Readonly<PbTranslationState>>>

  currentLanguage: WritableComputedRef<string | null | undefined>

  editMode: globalThis.Ref<Readonly<PbEditMode>>

  mutatedFields: globalThis.Ref<Readonly<PbMutatedField[]>>

  mutatedOptions: globalThis.Ref<MutatedParagraphOptions>

  ownerName: globalThis.Ref<Readonly<string>>
  currentUserIsOwner: globalThis.Ref<Readonly<boolean>>
  takeOwnership: () => void

  conversions: globalThis.ComputedRef<PbConversion[]>

  isDragging: globalThis.Ref<Readonly<boolean>>

  settings: globalThis.Ref<Record<string, any>>

  refreshKey: globalThis.Ref<Readonly<string>>

  dom: PbDomProvider
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
   * A background color class that is applied during editing when the paragraph
   * is being displayed standalone.
   */
  editBackgroundClass?: string
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

export interface PbFieldItemFragment<T extends any> {
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
  translations: PbEditEntityTranslation[]
  bundleLabel?: string
  editUrl?: string
}

export interface PbAvailableLanguage {
  id?: string
  name: string
}

export interface PbTranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: PbAvailableLanguage[]
  translations?: Array<string | null> | null
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
  targetUuid?: string
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
  selectAdditional: DraggableExistingParagraphItem
  editParagraph: EditParagraphEvent
  translateParagraph: TranslateParagraphEvent
  batchTranslate: undefined
  removeGhosts: undefined
  draggingStart: DraggableStartEvent
  draggingEnd: undefined
  setActiveFieldKey: string
  moveParagraph: MoveParagraphEvent
  moveMultipleParagraphs: MoveMultipleParagraphsEvent
  addNewParagraph: AddNewParagraphEvent
  addReusableParagraph: AddReusableParagraphEvent
  addClipboardParagraph: AddClipboardParagraphEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: PbMessage
  makeReusable: MakeReusableEvent
  undo: undefined
  redo: undefined
  keyPressed: KeyPressedEvent
  editEntity: undefined
  translateEntity: string
  reloadState: undefined
  reloadEntity: undefined
  revertAllChanges: undefined
  closeMenu: undefined
  importFromExisting: ImportFromExistingEvent
  exitEditor: undefined
  publish: undefined
  updateParagraphOptions: UpdateParagraphOptionEvent[]
  duplicateParagraph: string
  deleteParagraph: string

  // Selection.
  'select:start': undefined
  'select:end': string[]

  'paragraph:convert': ParagraphConvertEvent

  'paragraph:scrollIntoView': ParagraphScrollIntoViewEvent
  'animationFrame:before': undefined

  'state:reloaded': undefined

  'search:selectContentItem': PbSearchContentItem
  addContentSearchItemParagraph: AddContentSearchItemParagraphEvent
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

export default {}
