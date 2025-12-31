import type { ComputedRef } from 'vue'
import type { Eventbus } from '../editor/events'
import type { Rectangle } from '../editor/types/geometry'
import type { BlockOptionDefinition } from './blockOptions'
import type {
  BlokkliAdapter,
  AdapterContext,
  MutationResponseLike,
} from '../editor/adapter'

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
import type {
  BlokkliFragmentName,
  GlobalOptionsType,
} from '#blokkli-build/definitions'
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

import type { DefinitionProvider } from '../editor/providers/definition'

import type { DraggableSearchContentItem } from '#blokkli/editor/features/search/types'
import type { DraggableMediaLibraryItem } from '#blokkli/editor/features/media-library/types'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type { BlokkliApp } from '#blokkli/editor/types/app'

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

export type FieldConfig = {
  name: string
  entityType: string
  entityBundle: string
  label: string
  cardinality: number
  canEdit: boolean
  allowedBundles: string[]
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

export type DraggableItem =
  | DraggableClipboardItem
  | DraggableNewItem
  | DraggableActionItem
  | DraggableExistingBlock
  | DraggableExistingStructureBlock
  | DraggableReusableItem
  | DraggableSearchContentItem
  | DraggableMediaLibraryItem

export type Message = {
  type: 'success' | 'error' | 'warning'
  message: string
  additional?: string | Error | unknown
  replace?: boolean
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

export type StructureDragStart = {
  uuid: string
  bundle: string
}

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: MutatedOptions
  dom?: DomProvider
  definitions: DefinitionProvider
  useBlockRegistration?: (dom: DomProvider, uuid: string) => void
}

export type NativeBlokkliEditableBlurEvent = CustomEvent<{
  field: string
  text: string
}>

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

export type SelectedRect = Rectangle & {
  uuid: string
  style: DraggableStyle
}

export interface LibraryItemProps {
  block?: FieldListItem
  label?: string
  uuid?: string
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
