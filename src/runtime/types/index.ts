import type { ComputedRef } from 'vue'
import type { Eventbus } from '../editor/events'
import type { Rectangle } from '../editor/types/geometry'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import type { RGB } from './../../shared/types/theme'
import type { BlokkliDefinitionAddBehaviour } from './../../shared/types/definitions'
import type { DefinitionProvider } from '../editor/providers/definition'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type { MutatedOptions } from '#blokkli/editor/types/state'

export type { BlokkliDefinitionAddBehaviour }

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

export type EditMode = 'readonly' | 'editing' | 'translating' | 'review'

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
