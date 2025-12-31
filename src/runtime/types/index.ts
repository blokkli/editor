import type { Eventbus } from '../editor/events'
import type { DefinitionProvider } from '../editor/providers/definition'
import type { DomProvider } from '#blokkli/editor/providers/dom'
import type { MutatedOptions } from '#blokkli/editor/types/state'

import type { FieldListItem } from './field'

export type { FieldListItem }

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

export type ItemEditContext = {
  eventBus: Eventbus
  mutatedOptions: MutatedOptions
  dom?: DomProvider
  definitions: DefinitionProvider
  useBlockRegistration?: (dom: DomProvider, uuid: string) => void
}

export default {}
