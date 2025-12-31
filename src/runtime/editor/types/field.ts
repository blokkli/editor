import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { EntityContext } from '#blokkli/types'
import type { FieldDropAlignment } from '#blokkli/types/field'

export interface BlokkliItemHost {
  type: string
  uuid: string
  fieldName: string
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

export type RenderedFieldListItem = {
  uuid: string
  bundle: string
  isNew: boolean
  isPublished: boolean
  host: BlokkliItemHost & { bundle: string }
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
