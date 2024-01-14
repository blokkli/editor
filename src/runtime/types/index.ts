import type { Ref, ComputedRef } from 'vue'
import type { Emitter } from 'mitt'
import type { DomProvider } from '../helpers/domProvider'
import type { BlokkliAdapter, AdapterContext } from './../adapter'
import type { StorageProvider } from '../helpers/storageProvider'
import type { BlockDefinitionProvider } from '../helpers/typesProvider'
import type { SelectionProvider } from '../helpers/selectionProvider'
import type { KeyboardProvider } from '../helpers/keyboardProvider'
import type { UiProvider } from '../helpers/uiProvider'
import type { AnimationProvider } from '../helpers/animationProvider'
import type { StateProvider } from '../helpers/stateProvider'
import type { eventBus } from './../helpers/eventBus'
import type { BlockOptionDefinition } from './blokkOptions'
import type { TextProvider } from '../helpers/textProvider'
import type { BroadcastProvider } from '#blokkli/helpers/broadcastProvider'
import type { FeaturesProvider } from '#blokkli/helpers/featuresProvider'
import type { BlokkliIcon } from '#blokkli/icons'
import type { SettingsGroup, Viewport } from '#blokkli/constants'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidChunkNames,
  ValidFieldListTypes,
  ValidGlobalConfigKeys,
} from '#blokkli/generated-types'
import type { globalOptions } from '#blokkli/definitions'

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

type StringBoolean = '0' | '1' | ''

type GetType<T> = T extends { type: 'checkbox' }
  ? StringBoolean
  : T extends { type: 'radios' }
  ? T extends { options: infer O }
    ? keyof O
    : string
  : string

type WithOptions<T extends BlockDefinitionOptionsInput> = {
  [K in keyof T]: GetType<T[K]>
}

type GlobalOptionsType = typeof globalOptions

type GlobalOptionsKeyTypes<T extends ValidGlobalConfigKeys> = {
  [K in T[number]]: GetType<GlobalOptionsType[K]>
}

export type DefineBlokkliContext<
  T extends BlockDefinitionOptionsInput = {},
  G extends ValidGlobalConfigKeys | undefined = undefined,
> = {
  /**
   * The UUID of the item.
   */
  uuid: string

  /**
   * The index of the item in the field list.
   */
  index: ComputedRef<number>

  /**
   * Whether the item is being displayed in an editing context.
   */
  isEditing: boolean

  /**
   * The item type name (e.g. "teaser_list") of the parent item if this item is nested.
   */
  parentType: ComputedRef<BlockBundleWithNested | undefined>

  /**
   * The type of the field list the item is part of.
   */
  fieldListType: ComputedRef<ValidFieldListTypes>

  /**
   * All sibling blocks (including this one) that are in the same field.
   */
  siblings: ComputedRef<FieldListItemTyped[]>

  /**
   * All blocks that are in the root field (direct child of <BlokkliProvider>).
   */
  rootBlocks: ComputedRef<FieldListItemTyped[]>

  /**
   * The reactive runtime options.
   *
   * This includes both the locally defined options and the inherited global
   * options.
   */
  options: ComputedRef<
    (T extends BlockDefinitionOptionsInput ? WithOptions<T> : {}) &
      (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : {})
  >
}

export type BlockDefinitionOptionsInput = {
  [key: string]: BlockOptionDefinition
}

type DetermineVisibleOptionsContext<
  T extends BlockDefinitionOptionsInput = {},
  G extends GlobalOptionsKey[] | undefined = undefined,
> = {
  options: (T extends BlockDefinitionOptionsInput ? WithOptions<T> : {}) &
    (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : {})
  parentType: BlockBundleWithNested | undefined
}

type ExtractGlobalOptions<G extends GlobalOptionsKey[]> =
  G[number] extends GlobalOptionsKey ? G[number] : never

type CombineKeysAndGlobalOptions<
  T extends BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined,
> = keyof T | ExtractGlobalOptions<NonNullable<G>>

export type BlockDefinitionInput<
  Options extends BlockDefinitionOptionsInput = {},
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = {
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
  chunkName?: ValidChunkNames[]

  /**
   * Define options available for this block.
   */
  options?: Options

  /**
   * Global options to use.
   *
   * These options will be merged with the component-specific options.
   */
  globalOptions?: GlobalOptions

  /**
   * Determine which options should be visible in the editor based on the
   * given context.
   *
   * If a method is defined, it is called whenever any of the options change.
   */
  determineVisibleOptions?: (
    ctx: DetermineVisibleOptionsContext<Options, GlobalOptions>,
  ) => Array<CombineKeysAndGlobalOptions<Options, GlobalOptions>>

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
   * Define a custom title for this block at runtime in the editor.
   *
   * The title will be displayed to the editor to give some context. E.g. a
   * title block displays an excerpt from the title.
   *
   * If a method is provided, it receives the root element of this component
   * and should return a fitting title.
   *
   * If no method is defined or it doesn't return a value, the regular label
   * of the bundle (e.g. "Teaser") is displayed.
   */
  editTitle?: (el: HTMLElement) => string | undefined | null

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

export type FieldListItem = {
  uuid: string
  bundle: string
  isNew?: boolean
  options?: unknown
  props?: unknown
}

export type MutatedField = {
  name: string
  entityType: string
  entityUuid: string
  list: FieldListItem[]
}

export type FieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  cardinality: number
  canEdit: boolean
  allowedBundles: string[]
}

export type EditableFieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
}

export type EntityContext = {
  uuid: string
  type: string
  bundle: string
}

export type EditEntity = {
  id?: string
  label?: string
  changed?: number
  status?: boolean
  bundleLabel?: string
  editUrl?: string
}

export interface Language {
  id?: string
  name: string
}

export interface EntityTranslation {
  id: string
  url: string
  status: boolean
}

export interface TranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: Language[]
  translations?: EntityTranslation[]
}

export interface ConversionItem {
  sourceBundle: string
  targetBundle: string
}

export interface TransformPlugin {
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

export interface LibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}

export interface ImportItem {
  uuid: string
  label: string
}

export type CommentItem = {
  uuid: string
  itemUuids: string[]
  resolved: boolean
  body: string
  created: string
  user: { label: string }
}

export interface MutationItem {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedItemUuid?: string }
}

export interface Validation {
  message: string
  code?: string
  propertyPath?: string
}

export interface MappedState {
  currentIndex: number
  mutations: MutationItem[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    mutatedOptions?: any
    fields?: MutatedField[]
    violations?: Validation[]
  }
  entity: EditEntity
  translationState: TranslationState
  previewUrl?: string
}

export interface BlockBundleDefinition {
  id: string
  label: string
  description?: string
  allowReusable?: boolean
  isTranslatable?: boolean
}

export type EditMode = 'readonly' | 'editing' | 'translating'

export type MutatedOptions = {
  [uuid: string]: {
    [key: string]: string
  }
}

/**
 * Defines a content search item.
 */
export type SearchContentItem = {
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
   * The possible bundles for which a block may be added using this content item.
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
  item: SearchContentItem
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

export interface DraggableExistingBlock {
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
   * The reusable UUID if this block is a from_library type.
   */
  reusableUuid?: string

  /**
   * The title to use when displaying the block in lists during editing.
   */
  editTitle?: string

  parentBlockBundle: BlockBundleWithNested | undefined
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
  searchItem: SearchContentItem
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewItem
  | DraggableActionItem
  | DraggableExistingBlock
  | DraggableReusableItem
  | DraggableSearchContentItem

export type MoveBlockEvent = {
  afterUuid?: string
  item: DraggableExistingBlock
  host: DraggableHostData
}

export type MoveMultipleBlocksEvent = {
  afterUuid?: string
  uuids: string[]
  host: DraggableHostData
}

export type AddNewBlockEvent = {
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
  item: SearchContentItem
  host: DraggableHostData
  bundle: string
  afterUuid?: string
}

export type AddReusableItemEvent = {
  libraryItemUuid: string
  host: DraggableHostData
  afterUuid?: string
}

export type UpdateBlockOptionEvent = {
  uuid: string
  key: string
  value: string
}

export type EditBlockEvent = {
  uuid: string
  bundle: string
}

export type UpdateMutatedFieldsEvent = {
  fields: MutatedField[]
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

export type Message = {
  type: 'success' | 'error'
  message: string
}

export type DraggingMode = 'touch' | 'mouse'

export type DraggableStartEvent = {
  items: DraggableItem[]
  coords: Coord
  mode: DraggingMode
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

export type TranslateBlockEvent = {
  uuid: string
  language: Language
}

export type ImportFromExistingEvent = {
  sourceUuid: string
  sourceFields: string[]
}

export type ConvertBlockEvent = {
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

export type EditableType = 'plaintext' | 'markup' | 'table' | 'frame'

export type BlokkliEditableDirectiveArgs = {
  label?: string
  name?: string
  maxlength?: number
  required?: boolean
  type?: EditableType
}

export type EditableFieldFocusEvent = {
  fieldName: string
  block: DraggableExistingBlock
  element: HTMLElement
  args?: BlokkliEditableDirectiveArgs
  isComponent?: boolean
  value?: string
}

export type EditableFieldUpdateEvent = {
  name: string
  entityUuid: string
  value: string
}

export type EventbusEvents = {
  select: string
  'item:edit': EditBlockEvent
  batchTranslate: undefined
  'dragging:start': DraggableStartEvent
  'dragging:end': undefined
  setActiveFieldKey: string
  'add:block:new': AddNewBlockEvent
  updateMutatedFields: UpdateMutatedFieldsEvent
  animationFrame: AnimationFrameEvent
  message: Message
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

  'search:selectContentItem': SearchContentItem
  addContentSearchItem: AddContentSearchItemEvent
  'option:update': UpdateBlockOptionEvent

  'plugin:mount': PluginMountEvent
  'plugin:unmount': PluginUnmountEvent

  'editable:focus': EditableFieldFocusEvent
  'editable:update': EditableFieldUpdateEvent
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

export type Eventbus = Emitter<EventbusEvents>

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: Ref<MutatedOptions>
}

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: BlokkliAdapter<any>

  eventBus: typeof eventBus

  runtimeConfig: {
    langcodeWithoutPrefix: string
    itemEntityType: string
    defaultLanguage: string
  }

  dom: DomProvider
  storage: StorageProvider
  types: BlockDefinitionProvider
  selection: SelectionProvider
  keyboard: KeyboardProvider
  ui: UiProvider
  animation: AnimationProvider
  state: StateProvider
  context: ComputedRef<AdapterContext>
  $t: TextProvider
  broadcast: BroadcastProvider
  features: FeaturesProvider
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

export type AdapterMethods = keyof BlokkliAdapter<any>

export type FeatureDefinitionSettingRadiosOption = {
  label: string
  icon?: BlokkliIcon
}

export type FeatureDefinitionSettingRadios = {
  type: 'radios'
  label: string
  default: string
  options: Record<string, FeatureDefinitionSettingRadiosOption>
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSettingCheckbox = {
  type: 'checkbox'
  label: string
  default: boolean
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSettingMethod = {
  type: 'method'
  label: string
  method: () => void
  group?: SettingsGroup
  viewports?: Viewport[]
}

export type FeatureDefinitionSetting =
  | FeatureDefinitionSettingCheckbox
  | FeatureDefinitionSettingRadios
  | FeatureDefinitionSettingMethod

export type FeatureDefinition<
  Methods extends AdapterMethods[] = [],
  T extends string = '',
> = {
  id: T
  label?: string
  icon: BlokkliIcon
  description?: string
  dependencies?: T[]
  viewports?: Viewport[]
  requiredAdapterMethods?: [...Methods]
  settings?: Record<string, FeatureDefinitionSetting>
}

export type KeyboardShortcut = {
  group?: string
  meta?: boolean
  shift?: boolean
  code: string
  label: string
}

export default {}
