import type { ComputedRef } from 'vue'
import type { Emitter } from 'mitt'
import type { DomProvider } from '../helpers/domProvider'
import type { StorageProvider } from '../helpers/storageProvider'
import type { BlockDefinitionProvider } from '../helpers/typesProvider'
import type { SelectionProvider } from '../helpers/selectionProvider'
import type { KeyboardProvider } from '../helpers/keyboardProvider'
import type { UiProvider } from '../helpers/uiProvider'
import type { AnimationProvider } from '../helpers/animationProvider'
import type { StateProvider } from '../helpers/stateProvider'
import type { DirectiveProvider } from '../helpers/providers/directive'
import type { TextProvider } from '../helpers/textProvider'
import type { PluginProvider } from '../helpers/pluginProvider'
import type { eventBus } from './../helpers/eventBus'
import type { BlockOptionDefinition } from './blokkOptions'
import type {
  BlokkliAdapter,
  AdapterContext,
  MutationResponseLike,
} from './../adapter'
import type { BroadcastProvider } from '#blokkli/helpers/broadcastProvider'
import type { FeaturesProvider } from '#blokkli/helpers/featuresProvider'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { SettingsGroup, Viewport } from '#blokkli/constants'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
  GlobalOptionsKey,
  ValidChunkNames,
  ValidFieldListTypes,
  ValidGlobalConfigKeys,
  BundleProps,
} from '#blokkli-build/generated-types'
import type { ThemeProvider } from '#blokkli/helpers/themeProvider'
import type {
  BlokkliFragmentName,
  GlobalOptionsType,
} from '#blokkli-build/definitions'
import type { CommandsProvider } from '#blokkli/helpers/commandsProvider'
import type { TourProvider } from '#blokkli/helpers/tourProvider'
import type { DropAreaProvider } from '#blokkli/helpers/dropAreaProvider'
import type { RGB } from './theme'
import type { DebugProvider } from '#blokkli/helpers/debugProvider'
import type getVideoId from 'get-video-id'
import type { DefinitionProvider } from '../helpers/definitionProvider'
import type { IndicatorsProvider } from '#blokkli/helpers/indicatorsProvider'
import type { BlocksProvider } from '#blokkli/helpers/providers/blocks'
import type { FieldsProvider } from '#blokkli/helpers/providers/fields'
import type { ElementProvider } from '#blokkli/helpers/providers/element'

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

export type BlokkliDefinitionAddBehaviour =
  | 'no-form'
  | 'form'
  | `editable:${string}`

export type BlokkliDefinitionInputEditor<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
  Bundle extends BundleKey | string = string,
  PropsType = Bundle extends BundleKey
    ? BundleProps[Bundle]
    : Record<string, any>,
> = {
  /**
   * Determine which options should be visible in the editor based on the
   * given context.
   *
   * If a method is defined, it is called whenever any of the options change.
   */
  determineVisibleOptions?: (
    ctx: DetermineVisibleOptionsContext<Options, GlobalOptions, Bundle>,
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

  /**
   * Define how the nested fields should be structured when the block is
   * rendered without its component, for example when using
   * `:proxy-mode="true"` on <BlokkliField>.
   *
   * Each array should define an array of field names.
   *
   * @example
   * ```typescript
   * defineBlokkli({
   *   bundle: 'three_columns',
   *   editor: {
   *     fieldLayout: [
   *       ['header'],
   *       ['left', 'center', 'right'],
   *     ]
   *   }
   * })
   * ```
   */
  fieldLayout?: string[][]

  /**
   * Define how this component's props should be rendered in the diff view.
   *
   * By default, the diff feature assumes all props to be text and will render
   * plaintext props as HTML and convert complex props (such as arrays or objects)
   * to string using JSON.stringify().
   *
   * You can instead return a string representation of each prop that is used
   * to display the prop instead.
   *
   * For example, if the prop is an image, you may return the filename of the
   * image instead. If the prop is a number, you can return the formatted number.
   *
   * You can also return HTML as the value. The feature uses an HTML differ to
   * render the diff.
   */
  mapDiffProps?: (props?: PropsType) => Record<string, string>
}

export type BlockDefinitionRenderForParent = {
  parentBundle: BlockBundleWithNested
}

export type BlockDefinitionRenderForFieldList = {
  /**
   * @deprecated Use `fieldListType` instead.
   */
  fieldList: ValidFieldListTypes
}

export type BlockDefinitionRenderForFieldListType = {
  fieldListType: ValidFieldListTypes
}
export type BlockDefinitionRenderFor =
  | BlockDefinitionRenderForParent
  | BlockDefinitionRenderForFieldList
  | BlockDefinitionRenderForFieldListType

export type BlockDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = [],
  Bundle extends BundleKey | string = string,
> = {
  /**
   * The bundle ID of the block, e.g. "text" or "section_title".
   */
  bundle: Bundle

  /**
   * Define the name of a block bundle that supports nested blocks.
   * If a bundle is defined, then this component will be rendered if the
   * parent matches the given bundle.
   */
  renderFor?: BlockDefinitionRenderFor | BlockDefinitionRenderFor[]

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
  editor?: BlokkliDefinitionInputEditor<Options, GlobalOptions, Bundle>

  /**
   * Map which component prop maps to which field name.
   *
   * For example, if the field is named "field_paragraphs_header" and the prop
   * is named "headerParagraphs", you would define it as such:
   *
   * @example
   * ```vue
   * <template>
   *   <div>
   *     <BlokkliField :list="headerParagraphs" name="field_paragraphs_header" />
   *   </div>
   * <template>
   *
   * <script lang="ts" setup>
   * import type { ParagraphTwoColumnsFragment } from '#graphql-operations'
   *
   * defineProps<{
   *   headerParagraphs: ParagraphTwoColumnsFragment['headerParagraphs']
   * }>()
   *
   * defineBlokkli({
   *   bundle: 'section',
   *   propsFieldMapping: {
   *     headerParagraphs: 'field_paragraphs_header',
   *   }
   * })
   * </script>
   * ```
   */
  propsFieldMapping?: Bundle extends BundleKey
    ? Partial<Record<keyof BundleProps[Bundle], string>>
    : never
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
  | DraggableExistingStructureBlock
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
  item: ClipboardItem
  blockBundle: string
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
  gl: WebGLRenderingContext
  mouseX: number
  mouseY: number
  mouseArtboard: Coord
  artboardOffset: Coord
  artboardScale: number
  artboardSize: Size
  time: number
  selectedUuids: string[]
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
  isRendering: ComputedRef<boolean>
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

export type ActionPlacedEvent = {
  id: string
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

export type StructureDragStart = {
  uuid: string
  bundle: string
}

export type DropTargetEvent = {
  items: DraggableItem[]
  field: BlokkliFieldElement
  host: DraggableHostData
  preceedingUuid?: string
}

export type DropClipboardItemEvent = {
  id: string
  blockBundle: string
  host: DraggableHostData
  afterUuid?: string
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

  // Add action dropped.
  'item:dropped': undefined
  'block:append': BlockAppendEvent

  'item:doubleClick': RenderedFieldListItem

  scrollIntoView: ScrollIntoViewEvent
  'animationFrame:before': AnimationFrameBeforeEvent
  'animationFrame:after': undefined
  'canvas:draw': CanvasDrawEvent

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

  'droppable:focus': DroppableEntityField

  'drop:clipboardItem': DropClipboardItemEvent

  'sidebar:close': undefined
  'sidebar:open': string

  'action:placed': ActionPlacedEvent
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

  runtimeConfig: {
    itemEntityType: string
    defaultLanguage: string
  }

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
  description?: string
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
> = {
  /**
   * The unique ID of the feature.
   */
  id: string

  /**
   * The label of the feature.
   */
  label?: string

  /**
   * The icon of the feature.
   */
  icon: BlokkliIcon

  /**
   * Description of the feature.
   */
  description?: string

  /**
   * Dependencies of the feature.
   *
   * Loads this feature only after all of the given features have loaded.
   *
   * If one of the dependencies does not load, this feature won't load too.
   */
  dependencies?: T[]

  /**
   * The viewports for which this feature will be loaded.
   */
  viewports?: Viewport[]

  /**
   * The adapter methods required for this feature to work.
   *
   * If the adapter does not implement all methods, the feature won't load.
   */
  requiredAdapterMethods?: [...Methods]

  /**
   * Feature-specific settings that will be rendered in the settings dialog.
   */
  settings?: Record<string, FeatureDefinitionSetting>

  /**
   * Name of the screenshot image file, relative to the feature directory.
   */
  screenshot?: string

  /**
   * If true, the feature has to be explicitly enabled before it is loaded.
   */
  beta?: boolean
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

export type ProviderDefinitionInput<
  Options extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  GlobalOptions extends GlobalOptionsKey[] | undefined = undefined,
> = {
  /**
   * The entity type.
   */
  entityType: string

  /**
   * The bundle.
   */
  bundle: string

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
  enabled?: boolean
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

export default {}
