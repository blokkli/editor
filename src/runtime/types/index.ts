import type { ComputedRef } from 'vue'
import type { Emitter } from 'mitt'
import type { DomProvider } from '../editor/providers/dom'
import type { StorageProvider } from '../editor/providers/storage'
import type { BlockDefinitionProvider } from '../editor/providers/types'
import type { SelectionProvider } from '../editor/providers/selection'
import type { KeyboardProvider } from '../editor/providers/keyboard'
import type { UiProvider } from '../editor/providers/ui'
import type { AnimationProvider } from '../editor/providers/animation'
import type { StateProvider } from '../editor/providers/state'
import type { IconsProvider } from '../editor/providers/icons'
import type { DirectiveProvider } from '../editor/providers/directive'
import type { TextProvider } from '../editor/providers/texts'
import type { PluginProvider } from '../editor/providers/plugin'
import type { eventBus } from '../editor/events'
import type { BlockOptionDefinition } from './blockOptions'
import type {
  BlokkliAdapter,
  AdapterContext,
  MutationResponseLike,
} from '../editor/adapter'
import type { BroadcastProvider } from '../editor/providers/broadcast'
import type { FeaturesProvider } from '../editor/providers/features'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { SettingsGroup, Viewport } from '../../shared/constants'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidChunkNames,
  ValidFieldListTypes,
  ValidGlobalConfigKeys,
  BundleProps,
} from '#blokkli-build/generated-types'
import type { ThemeProvider } from '../editor/providers/theme'
import type {
  BlokkliFragmentName,
  GlobalOptionsType,
} from '#blokkli-build/definitions'
import type { CommandsProvider } from '../editor/providers/commands'
import type { TourProvider } from '../editor/providers/tour'
import type { DropAreaProvider } from '../editor/providers/dropArea'
import type { RGB } from './../../shared/types/theme'
import type {
  BlockDefinitionInputBase,
  BlockDefinitionRenderForBase,
  BlockDefinitionRenderForFieldListBase,
  BlockDefinitionRenderForFieldListTypeBase,
  BlockDefinitionRenderForParentBase,
  BlokkliDefinitionAddBehaviour,
  BlokkliDefinitionInputEditorBase,
  FragmentDefinitionInputBase,
  ProviderDefinitionInputBase,
} from './../../shared/types/definitions'
import type {
  FeatureDefinitionBase,
  FeatureDefinitionSettingCheckbox,
  FeatureDefinitionSettingSlider,
} from './../../shared/types/features'

import type { DebugProvider } from '../editor/providers/debug'
import type getVideoId from 'get-video-id'
import type { DefinitionProvider } from '../editor/providers/definition'
import type { IndicatorsProvider } from '../editor/providers/indicators'
import type { BlocksProvider } from '#blokkli/editor/providers/blocks'
import type { FieldsProvider } from '#blokkli/editor/providers/fields'
import type { ElementProvider } from '#blokkli/editor/providers/element'

export type { BlokkliDefinitionAddBehaviour }
export type { FeatureDefinitionSettingCheckbox, FeatureDefinitionSettingSlider }

export type MutateWithLoadingStateFunction = (
  promise: () => Promise<MutationResponseLike<any>> | undefined,
  errorMessage?: string | false,
  successMessage?: string,
) => Promise<boolean>

type GetType<T> = T extends { options: infer O }
  ? T extends { type: 'checkboxes' }
    ? Array<keyof O>
    : keyof O
  : T extends { type: 'checkbox' }
    ? boolean
    : T extends { type: 'range' }
      ? number
      : T extends { type: 'number' }
        ? number
        : string

export type BlockDefinitionOptionsInput = {
  [key: string]: BlockOptionDefinition
}

type WithOptions<T extends BlockDefinitionOptionsInput> = {
  [K in keyof T]: GetType<T[K]>
}

type GlobalOptionsKeyTypes<T extends ValidGlobalConfigKeys> = {
  [K in T[number]]: GetType<GlobalOptionsType[K]>
}

export type BundleKey = keyof BundleProps

export type DefineBlokkliContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
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
    (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
      (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  >

  /**
   * The provider context.
   */
  provider: ComputedRef<BlokkliProviderEntityContext | null>
}

export type DefineProviderContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends ValidGlobalConfigKeys | undefined = undefined,
> = {
  /**
   * The reactive runtime options.
   *
   * This includes both the locally defined options and the inherited global
   * options.
   */
  options: ComputedRef<
    (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
      (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  >
}

type DetermineVisibleOptionsContext<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
  B extends BundleKey | string = string,
> = {
  options: (T extends BlockDefinitionOptionsInput ? WithOptions<T> : object) &
    (G extends ValidGlobalConfigKeys ? GlobalOptionsKeyTypes<G> : object)
  parentType: BlockBundleWithNested | undefined
  fieldListType: ValidFieldListTypes
  props: B extends BundleKey ? BundleProps[B] : Record<string, any>
  entity: AdapterContext
}

type ExtractGlobalOptions<G extends GlobalOptionsKey[]> =
  G[number] extends GlobalOptionsKey ? G[number] : never

type CombineKeysAndGlobalOptions<
  T extends BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined,
> = keyof T | ExtractGlobalOptions<NonNullable<G>>

export type BlokkliDefinitionInputEditor<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
  Bundle extends BundleKey | string = string,
  PropsType = Bundle extends BundleKey
    ? BundleProps[Bundle]
    : Record<string, any>,
> = Omit<
  BlokkliDefinitionInputEditorBase<Options, BlokkliIcon, PropsType>,
  'determineVisibleOptions'
> & {
  /**
   * Determine which options should be visible in the editor based on the
   * given context.
   *
   * If a method is defined, it is called whenever any of the options change.
   */
  determineVisibleOptions?: (
    ctx: DetermineVisibleOptionsContext<Options, GlobalOptions, Bundle>,
  ) => Array<CombineKeysAndGlobalOptions<Options, GlobalOptions>>
}

export type BlockDefinitionRenderForParent =
  BlockDefinitionRenderForParentBase<BlockBundleWithNested>

export type BlockDefinitionRenderForFieldList =
  BlockDefinitionRenderForFieldListBase<ValidFieldListTypes>

export type BlockDefinitionRenderForFieldListType =
  BlockDefinitionRenderForFieldListTypeBase<ValidFieldListTypes>

export type BlockDefinitionRenderFor = BlockDefinitionRenderForBase<
  BlockBundleWithNested,
  ValidFieldListTypes
>

export type BlockDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = [],
  Bundle extends BundleKey | string = string,
> = Omit<
  BlockDefinitionInputBase<
    Options,
    GlobalOptions,
    Bundle,
    ValidChunkNames,
    BlockBundleWithNested,
    ValidFieldListTypes,
    BlokkliIcon,
    BundleProps
  >,
  'editor'
> & {
  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions, Bundle>
}

export type RuntimeBlockDefinitionInput = {
  bundle: string
}

export type InjectedBlokkliItem = {
  index: ComputedRef<number>
  uuid: string
  options?: Record<string, string> | undefined
  isEditing: boolean
  parentType?: BlockBundleWithNested
  fieldListType?: ValidFieldListTypes
  fragmentName?: string
}

export type FieldListItem = {
  uuid: string
  bundle: string
  isVisible: boolean
  options?: Record<string, any>
  editContext?: BlockEditContext
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

export type BlokkliProviderEntityContext = {
  uuid: string
  type: string
  bundle: string
  language?: string
}

export type EditPermission = 'view' | 'edit' | 'review'

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

export type PluginConfigInputText = {
  type: 'text'
  name: string
  label: string
  description?: string
  required: boolean
  defaultValue?: string
  minLength?: number
  maxLength?: number
  placeholder?: string
  pattern?: string
  multiline?: boolean
  rows?: number
}

export type PluginConfigInputSeed = {
  type: 'seed'
  name: string
  label: string
  description?: string
  required: boolean
}

export type PluginConfigInputCheckbox = {
  type: 'checkbox'
  name: string
  label: string
  description?: string
  required: boolean
  checkboxLabel?: string
  defaultValue: boolean
}

export type PluginConfigInputOptions = {
  type: 'options'
  name: string
  label: string
  description?: string
  required: boolean
  defaultValue?: string
  variant: 'select' | 'radio'
  options: { value: string; label: string }[]
}

export type PluginConfigInput =
  | PluginConfigInputText
  | PluginConfigInputSeed
  | PluginConfigInputCheckbox
  | PluginConfigInputOptions

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
  targetBundles?: string[]

  /**
   * The minimum number of items required.
   */
  min: number

  /**
   * The maximum number of items.
   */
  max: number

  configInputs?: PluginConfigInput[]

  description?: string

  /**
   * Whether the transform plugin supports previewing the changes first.
   *
   * If true, the plugin is expected to to defer producing any side effects
   * to when it's executed in non-preview mode.
   */
  preview?: boolean
}

export type PluginConfigInputItem = {
  name: string
  value: string
}

export interface HostTransformPlugin {
  /**
   * The ID of the plugin.
   */
  id: string

  /**
   * The label of the transform plugin which is shown in the editor.
   */
  label: string

  configInputs?: PluginConfigInput[]

  description?: string

  /**
   * Whether the transform plugin supports previewing the changes first.
   *
   * If true, the plugin is expected to to defer producing any side effects
   * to when it's executed in non-preview mode.
   */
  preview?: boolean
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
  description?: string
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
  enabled?: boolean
}

export interface Validation {
  message: string
  code?: string
  propertyPath?: string
  entityType?: string
  entityUuid?: string
}

export interface MappedState {
  currentIndex: number
  mutations: MutationItem[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    mutatedOptions?: any
    mutatedHostOptions?: Record<string, string>
    fields?: MutatedField[]
    violations?: Validation[]
  }
  publishOptions: PublishOptions
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
  hasPublishOn?: boolean
  hasUnpublishOn?: boolean
}

export type EditMode = 'readonly' | 'editing' | 'translating' | 'review'

export type MutatedOptions = {
  [uuid: string]: {
    [key: string]: string
  }
}

export type MutatedItemProps = {
  [uuid: string]:
    | {
        [key: string]: string
      }
    | undefined
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
   * The entity type of the item.
   */
  entityType: string

  /**
   * The entity bundle of the item.
   */
  entityBundle: string

  /**
   * The title displayed to the user.
   */
  title: string

  /**
   * The possible bundles for which a block may be added using this content item.
   */
  targetBundles: string[]

  /**
   * Additional context displayed alongside the title.
   */
  context?: string

  /**
   * The text displayed to the user.
   */
  text?: string

  /**
   * An optional image URL that is used instead of an icon.
   */
  imageUrl?: string
}

interface ClipboardItemText {
  type: 'text'
  id: string
  itemBundle: string
  data: string
  additional?: string
}

export interface ClipboardItemVideo {
  type: 'video'
  id: string
  itemBundle: string
  data: string
  additional?: string
  videoService: ReturnType<typeof getVideoId>['service']
  videoId: string
}

interface ClipboardItemImage {
  type: 'image'
  id: string
  itemBundle: string
  data: string
  additional: string
  fileName: string
  fileSize: number
  fileType: string
}

export interface ClipboardItemFile {
  type: 'file'
  id: string
  itemBundle: string
  data: string
  additional: string
  fileName: string
  fileSize: number
  fileType: string
}

export type ClipboardItem =
  | ClipboardItemText
  | ClipboardItemVideo
  | ClipboardItemImage
  | ClipboardItemFile

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

export interface DraggableExistingStructureBlock {
  itemType: 'existing_structure'
  block: RenderedFieldListItem
  element: () => HTMLElement
}

export interface DraggableExistingBlock {
  itemType: 'existing'
  block: RenderedFieldListItem
}

export interface DraggableNewItem {
  itemType: 'new'
  element: () => HTMLElement
  itemBundle: string
}

export interface DraggableActionItem {
  itemType: 'action'
  actionType: string
  action: AddAction
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
  additional?: string
  clipboardId: string
}

export interface DraggableSearchContentItem {
  itemType: 'search_content'
  element: () => HTMLElement
  itemBundles: string[]
  searchItem: SearchContentItem
}

export interface DraggableMediaLibraryItem {
  itemType: 'media_library'
  element: () => HTMLElement
  itemBundles: string[]
  mediaId: string
  mediaBundle: string
}

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewItem
  | DraggableActionItem
  | DraggableExistingBlock
  | DraggableExistingStructureBlock
  | DraggableReusableItem
  | DraggableSearchContentItem
  | DraggableMediaLibraryItem

export type MoveBlockEvent = {
  afterUuid: string | null
  item: DraggableExistingBlock
  host: DraggableHostData
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

export type AddContentSearchItemEvent = {
  item: SearchContentItem
  host: DraggableHostData
  bundle: string
  afterUuid: string | null
}

export type AddReusableItemEvent = {
  libraryItemUuid: string
  host: DraggableHostData
  afterUuid: string | null
}

export type UpdateBlockOptionEvent = {
  uuid: string
  key: string
  value: string
}

export type UpdateHostOptionEvent = {
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
  time: number
}

export type Message = {
  type: 'success' | 'error' | 'warning'
  message: string
  additional?: string | Error | unknown
  replace?: boolean
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
  mouseArtboard: Coord
  artboardOffset: Coord
  artboardScale: number
  artboardSize: Size
  time: number
  selectedUuids: string[]
  dpi: number
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

export type BlockAppendEvent = {
  bundle: string
  host: DraggableHostData
  afterUuid: string | null
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
  nestingLevel: number
  fieldListType: ValidFieldListTypes
  hostEntityType: string
  hostEntityBundle: string
  hostEntityUuid: string
  allowedBundles: string[]
  allowedFragments: string[]
  cardinality: number
  element: HTMLElement
  dropAlignment: FieldDropAlignment | null
}

export type FieldDropAlignment = 'vertical' | 'horizontal'

export type ActionPlacedData = {
  preceedingUuid: string | null
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

export type StructureDragStart = {
  uuid: string
  bundle: string
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid: string | null
}

export type DropClipboardItemEvent = {
  id: string
  blockBundle: string
  host: DraggableHostData
  afterUuid: string | null
}

export type LibraryEditItemEvent = {
  url: string
  uuid: string
  label?: string
}

export type AnimationFrameBeforeEvent = {
  time: number
  mouseX: number
  mouseY: number
}

type MultiSelectStartEvent = {
  x: number
  y: number
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

  addContentSearchItem: AddContentSearchItemEvent
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

export type Eventbus = Emitter<EventbusEvents>

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: MutatedOptions
  dom?: DomProvider
  definitions: DefinitionProvider
  useBlockRegistration?: (dom: DomProvider, uuid: string) => void
}

export interface BlokkliApp {
  /**
   * The adapter.
   */
  adapter: BlokkliAdapter<any>

  eventBus: typeof eventBus

  dom: DomProvider
  storage: StorageProvider
  types: BlockDefinitionProvider
  selection: SelectionProvider
  blocks: BlocksProvider
  keyboard: KeyboardProvider
  element: ElementProvider
  ui: UiProvider
  animation: AnimationProvider
  definitions: DefinitionProvider
  state: StateProvider
  context: ComputedRef<AdapterContext>
  $t: TextProvider
  broadcast: BroadcastProvider
  features: FeaturesProvider
  theme: ThemeProvider
  commands: CommandsProvider
  tour: TourProvider
  dropAreas: DropAreaProvider
  debug: DebugProvider
  indicators: IndicatorsProvider
  plugins: PluginProvider
  directive: DirectiveProvider
  fields: FieldsProvider
  icons: IconsProvider
}

export type PasteExistingBlocksEvent = {
  uuids: string[]
  host: DraggableHostData
  preceedingUuid: string | null
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

export type FeatureDefinitionSettingMethod = {
  type: 'method'
  label: string
  method: (app: BlokkliApp) => void
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
> = Omit<
  FeatureDefinitionBase<AdapterMethods, BlokkliIcon, T>,
  'requiredAdapterMethods' | 'settings'
> & {
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
  onDrop: () => Promise<any> | any
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
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = Omit<
  FragmentDefinitionInputBase<
    Options,
    GlobalOptions,
    ValidChunkNames,
    BlokkliIcon
  >,
  'editor'
> & {
  /**
   * Settings for the behaviour in the editor.
   */
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions>
}

export type ProviderDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = ProviderDefinitionInputBase<Options, GlobalOptions>

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

export type SelectedRect = Rectangle & {
  uuid: string
  style: DraggableStyle
}

export interface LibraryItemProps {
  block?: FieldListItem
  label?: string
  uuid?: string
}

export type PublishOptions = {
  canPublish: boolean
  isRevisionable: boolean
  hasRevisionLogMessage: boolean
  lastChanged: string | null
  canSchedule: boolean
  publishOn: string | null
  revisionLogMessage: string | null
}

export type GetEditStatesItem = {
  hostEntityType: string
  hostEntityUuid: string
  entity: EditEntity
  currentUserIsOwner: boolean
}

export type BlockIndicator = {
  id: string
  uuid: string
  element: HTMLElement
  position: 'left' | 'right'
}

export type AddActionColor = 'rose' | 'lime' | 'accent'

export type AddAction = {
  id: string
  icon: BlokkliIcon
  color: AddActionColor
  itemBundle?: string
  title: string
  description?: string
  callback: (action: ActionPlacedData) => void
  enabled?: (item: RenderedFieldListItem) => boolean
}

export type BlockEditContext = {
  isPublished: boolean
  isNew: boolean
  publishOn?: string | null
  unpublishOn?: string | null
}

export type RenderedFieldListItem = {
  uuid: string
  bundle: string
  isNew: boolean
  isPublished: boolean
  host: DraggableHostData & { bundle: string }
  fieldListType: ValidFieldListTypes
  parentBlockBundle: BlockBundleWithNested | null
  library: {
    label: string
    libraryItemUuid: string
    reusableBundle: string
  } | null
  fragment: {
    name: BlokkliFragmentName
  } | null
  isNested: boolean
  publishOn?: string | null
  unpublishOn?: string | null
}

export type BlokkliDirectiveType = 'editable' | 'droppable'

export type RegisteredField = {
  element: HTMLElement
  entity: EntityContext
  fieldName: string
  fieldListType: ValidFieldListTypes
  allowedFragments: BlokkliFragmentName[]
  isNested: boolean
  nestingLevel: number
  dropAlignment: FieldDropAlignment | null
}

export type RegisterFieldData = Pick<
  RegisteredField,
  | 'fieldListType'
  | 'allowedFragments'
  | 'isNested'
  | 'nestingLevel'
  | 'dropAlignment'
>

export type VueClassProp = string | Record<string, boolean> | VueClassProp[]

export type SidebarRegion = 'left' | 'right'

export type GlobalUiDialog = {
  id: string
  alignment: 'left' | 'right' | 'center'
  confirmClose?: boolean
}

export default {}
