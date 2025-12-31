import type { ComputedRef } from 'vue'
import type { Eventbus } from '../editor/events'
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import type { BlokkliDefinitionAddBehaviour } from './../../shared/types/definitions'
import type { DefinitionProvider } from '../editor/providers/definition'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type { MutatedOptions } from '#blokkli/editor/types/state'

import type { FieldListItem } from './field'

export type { BlokkliDefinitionAddBehaviour, FieldListItem }

export type InjectedBlokkliItem = {
  index: ComputedRef<number>
  uuid: string
  options?: Record<string, string> | undefined
  isEditing: boolean
  parentType?: BlockBundleWithNested
  fieldListType?: ValidFieldListTypes
  fragmentName?: string
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

export interface DraggableHostData {
  type: string
  uuid: string
  fieldName: string
}

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: MutatedOptions
  dom?: DomProvider
  definitions: DefinitionProvider
  useBlockRegistration?: (dom: DomProvider, uuid: string) => void
}

export type VueClassProp = string | Record<string, boolean> | VueClassProp[]

export default {}
