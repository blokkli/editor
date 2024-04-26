import type { Ref, ComputedRef } from 'vue'
import type { Emitter } from 'mitt'
import type { DomProvider } from '../helpers/domProvider'
import type { StorageProvider } from '../helpers/storageProvider'
import type { BlockDefinitionProvider } from '../helpers/typesProvider'
import type { SelectionProvider } from '../helpers/selectionProvider'
import type { KeyboardProvider } from '../helpers/keyboardProvider'
import type { UiProvider } from '../helpers/uiProvider'
import type { AnimationProvider } from '../helpers/animationProvider'
import type { StateProvider } from '../helpers/stateProvider'
import type { TextProvider } from '../helpers/textProvider'
import type { eventBus } from './../helpers/eventBus'
import type { BlockOptionDefinition } from './blokkOptions'
import type { BlokkliAdapter, AdapterContext } from './../adapter'
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
import type { ThemeProvider } from '#blokkli/helpers/themeProvider'
import type { CommandsProvider } from '#blokkli/helpers/commandsProvider'
import type { TourProvider } from '#blokkli/helpers/tourProvider'
import type { DropAreaProvider } from '#blokkli/helpers/dropAreaProvider'
import type { RGB } from './theme'

interface MutationResponseLike<T> {
  success?: boolean
  state?: T
}

export type MutateWithLoadingStateFunction = (
  promise: Promise<MutationResponseLike<any>> | undefined,
  errorMessage?: string,
  successMessage?: string,
) => Promise<boolean>

type GetType<T> = T extends { options: infer O }
  ? T extends { type: 'checkboxes' }
    ? Array<keyof O>
    : keyof O
  : T extends { type: 'checkbox' }
    ? boolean
    : string

export type BlockDefinitionOptionsInput = {
  [key: string]: BlockOptionDefinition
}

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

type DetermineVisibleOptionsContext<
  T extends BlockDefinitionOptionsInput = {},
  G extends GlobalOptionsKey[] | undefined = undefined,
> = {
  options: (T extends BlockDefinitionOptionsInput ? WithOptions<T> : {}) &
    (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : {})
  parentType: BlockBundleWithNested | undefined
  props: Record<string, any>
}

type ExtractGlobalOptions<G extends GlobalOptionsKey[]> =
  G[number] extends GlobalOptionsKey ? G[number] : never

type CombineKeysAndGlobalOptions<
  T extends BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined,
> = keyof T | ExtractGlobalOptions<NonNullable<G>>

export type BlokkliDefinitionAddBehaviour =
  | 'no-form'
  | 'form'
  | `editable:${string}`

export type BlokkliDefinitionInputEditor<
  Options extends BlockDefinitionOptionsInput = {},
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = {
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
   * Disable editing for blocks that don't have any editable fields.
   *
   * This disables the "Edit" button in the actions overlay and double click
   * to edit.
   */
  disableEdit?: boolean

  /**
   * If set, if this block is being rendered standalone (e.g. when inside the
   * "add to library" dialog), the given will be used as the root width. The
   * rendered block is then scaled down so that it fits the available space.
   */
  previewWidth?: number

  /**
   * When set to true the preview in the library is not rendered.
   *
   * This should be used for complex components that render things like sliders,
   * iframes, modals, etc.
   */
  noPreview?: boolean

  /**
   * A background color class that is applied during editing when the component
   * is being displayed standalone in a preview.
   *
   * For example, when the block can be made reusable and is being disabled in
   * the "Add from Library" dialog, the given background class is used on the
   * parent element.
   *
   * This can be used for blocks that render white text and are always
   * rendered on top of a black background. Defining a background class makes
   * sure the text is visible for the user.
   */
  previewBackgroundClass?: string

  /**
   * Define the behaviour when a new block is added of this type.
   *
   * Possible options:
   * - 'form' (default)
   *    Shows the full form to enter block values.
   * - 'no-form'
   *    Immediately adds the block without showing the full form.
   * - 'editable:${string}'
   *    Immediately add the block without showing the full form and
   *    immediately open the editable field form with the given name.
   *    For example, when the block has an editable field named "body"
   *    a possible value would be 'editable:body'.
   */
  addBehaviour?: BlokkliDefinitionAddBehaviour

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
   * Build mock props for this component that are used when this block can
   * be added from clipboard or search text content.
   *
   * The props are then used to render a preview of the block.
   *
   * For example, when pasting text into the editor and if supported by the
   * adapter, the clipboard text content is passed as an argument.
   */
  mockProps?: (text?: string) => Record<string, any>

  /**
   * Hides the block from the add list if more than the given amount of
   * blocks aready exist on the page.
   *
   * Note this only affects the behaviour in the editor, it's still possible
   * to have more blocks on the page, just not via the editor.
   */
  maxInstances?: number

  /**
   * Get the drag element for the editor.
   *
   * By default, the root element of the component is used for drag actions.
   * Sometimes this might not be desirable however. For example, a button
   * block might render a container as the root element and have the button
   * as the child. In this case the whole container would be clickable and
   * selectable. By providing the button as the drag element, only the button
   * appears to be selectable/draggable.
   */
  getDraggableElement?: (el: HTMLElement) => Element | undefined | null
}

export type BlockDefinitionInput<
  Options extends BlockDefinitionOptionsInput = {},
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = {
  /**
   * The bundle ID of the block, e.g. "text" or "section_title".
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
  chunkName?: ValidChunkNames

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
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions>
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
  options?: Record<string, any>
  props?: Record<string, any>
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

export type EditableFieldType = 'plain' | 'markup' | 'table' | 'frame'

export type EditableFieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  type: EditableFieldType
  required: boolean
  maxLength: number
}

export type EntityContext = {
  uuid: string
  type: string
  bundle: string
}

export type EditEntity = {
  label?: string
  status?: boolean
  bundleLabel?: string
}

export interface Language {
  id: string
  name: string
}

export interface EntityTranslation {
  id: string
  url: string
  editUrl?: string
  exists: boolean
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
  blockUuids: string[]
  resolved: boolean
  body: string
  created: string | number
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
  mutatedEntity?: any
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

export type DraggableStyle = {
  /**
   * The border radius for every corner, starting from top left.
   */
  radius: [number, number, number, number]

  /**
   * The smallest radius of the element.
   */
  radiusMin: number

  /**
   * The border radius as a CSS property value.
   */
  radiusString: string

  /**
   * The contrast color for highlighting.
   */
  contrastColor: string

  /**
   * The translucent contrast color for highlighting.
   */
  contrastColorTranslucent: string

  /**
   * The color to make a text (mostly) readable when put on top of the element.
   */
  textColor: string

  contrastColorRGB: RGB
  isInverted: boolean
}

export interface DraggableExistingBlock {
  itemType: 'existing'
  element: () => HTMLElement
  dragElement: () => HTMLElement | SVGElement
  entityType: string
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

export interface DraggableMediaLibraryItem {
  itemType: 'media_library'
  element: () => HTMLElement
  itemBundle: string
  mediaId: string
  mediaBundle: string
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewItem
  | DraggableActionItem
  | DraggableExistingBlock
  | DraggableReusableItem
  | DraggableSearchContentItem
  | DraggableMediaLibraryItem

/**
 * Defines a droppable entity field.
 */
export type DroppableEntityField = {
  /**
   * The droppable field element.
   */
  element: HTMLElement

  /**
   * The host.
   */
  host: DraggableExistingBlock | EntityContext

  /**
   * The name of the field on which entities can be dropped.
   */
  fieldName: string
}
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
  bundle: string
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
  fieldAreas: AnimationFrameFieldArea[]
  mouseX: number
  mouseY: number
}

export type Message = {
  type: 'success' | 'error'
  message: string
}

export type Size = {
  width: number
  height: number
}

export type Coord = {
  x: number
  y: number
}

export type Rectangle = Size & Coord

export type CanvasDrawEvent = {
  mouseX: number
  mouseY: number
  artboardOffset: Coord
  artboardScale: number
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

export type EditableFieldFocusEvent = {
  fieldName: string
  uuid: string
}

export type EditableFieldUpdateEvent = {
  name: string
  entityUuid: string
  value: string
}

export type BlockAppendEvent = {
  bundle: string
  host: DraggableHostData
  afterUuid?: string
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

export type BlokkliFieldElement = {
  key: string
  name: string
  label: string
  isNested: boolean
  hostEntityType: string
  hostEntityBundle: string
  hostEntityUuid: string
  allowedBundles: string[]
  allowedFragments: string[]
  cardinality: number
  element: HTMLElement
  dropAlignment?: 'vertical' | 'horizontal'
}

export type ActionPlacedEvent = {
  action: DraggableActionItem
  preceedingUuid?: string
  host: DraggableHostData
  field: BlokkliFieldElement
}

export type InteractionMode = 'mouse' | 'touch'

export type DraggableStartEvent = {
  items: DraggableItem[]
  coords: Coord
  mode: InteractionMode
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

export type SelectStartEvent = {
  uuids: string[]
  mode: InteractionMode
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
  translateEntity: EntityTranslation
  reloadState: undefined
  reloadEntity: undefined

  // Selection.
  'select:start': SelectStartEvent
  'select:toggle': string
  'select:shiftToggle': string
  'select:end': string[] | undefined
  'select:previous': undefined
  'select:next': undefined

  // Add action dropped.
  'item:dropped': undefined
  'block:append': BlockAppendEvent

  scrollIntoView: ScrollIntoViewEvent
  'animationFrame:before': undefined
  'canvas:draw': CanvasDrawEvent

  'state:reloaded': undefined

  'search:selectContentItem': SearchContentItem
  addContentSearchItem: AddContentSearchItemEvent
  'option:update': UpdateBlockOptionEvent

  'plugin:mount': PluginMountEvent
  'plugin:unmount': PluginUnmountEvent

  'editable:focus': EditableFieldFocusEvent
  'editable:update': EditableFieldUpdateEvent
  'editable:save': undefined

  'droppable:focus': DroppableEntityField

  'sidebar:close': undefined

  'action:placed': ActionPlacedEvent

  'animator:add': AnimatorAddEvent

  'ui:resized': undefined
  'add-list:change': undefined
  'window:clickAway': undefined

  'mouse:down': GlobalPointerEvent
  'mouse:move': GlobalPointerEvent
  'mouse:up': GlobalPointerUpEvent
}

export type Eventbus = Emitter<EventbusEvents>

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: Ref<MutatedOptions>
  dom?: DomProvider
}

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: BlokkliAdapter<any>

  eventBus: typeof eventBus

  runtimeConfig: {
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
  theme: ThemeProvider
  commands: CommandsProvider
  tour: TourProvider
  dropAreas: DropAreaProvider
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

export type FeatureDefinitionSettingSlider = {
  type: 'slider'
  label: string
  default: number
  group?: SettingsGroup
  viewports?: Viewport[]
  min: number
  max: number
  step: number
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
  | FeatureDefinitionSettingSlider

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
  screenshot?: string
}

export type KeyboardShortcut = {
  group?: string
  meta?: boolean
  shift?: boolean
  code: string
  label: string
}

export type CommandGroup =
  | 'ui'
  | 'selection'
  | 'add'
  | 'action'
  | 'misc'
  | 'options'

export type Command = {
  id: string
  label: string
  group?: CommandGroup
  icon?: BlokkliIcon
  bundle?: string
  disabled?: boolean
  callback: () => any
}

export type DropArea = {
  id: string
  label: string
  icon?: BlokkliIcon
  element: HTMLElement
  onDrop: () => Promise<any>
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

export type FragmentDefinitionInput<
  Options extends BlockDefinitionOptionsInput = {},
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = {
  /**
   * The unique name of this fragment.
   */
  name: string

  /**
   * The label of the fragment.
   */
  label: string

  /**
   * A short description.
   */
  description?: string

  /**
   * The name of the chunk group.
   *
   * If this value is set, the component will be assigned to this
   * import chunk. Multiple components can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: ValidChunkNames

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
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions>
}

export type TourItem = {
  id: string
  title: string
  text: string
  element:
    | HTMLElement
    | (() => HTMLElement | undefined | null)
    | undefined
    | null
}

export type DroppableFieldConfig = {
  name: string
  label: string
  entityType: string
  entityBundle: string
  allowedEntityType: string
  allowedBundles: string[]
  cardinality: number
  required: boolean
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid?: string
}

export type SelectedRect = Rectangle & {
  uuid: string
  style: DraggableStyle
}

export default {}
