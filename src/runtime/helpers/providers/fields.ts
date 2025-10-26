import type { BlokkliFieldElement } from '#blokkli/types'
import onBlokkliEvent from '../composables/onBlokkliEvent'
import type { DomProvider } from '../domProvider'
import type { StateProvider } from '../stateProvider'
import type { BlockDefinitionProvider } from '../typesProvider'

export type FieldsProvider = {
  find: (uuid: string, fieldName: string) => BlokkliFieldElement | undefined
}

export default function (
  state: StateProvider,
  dom: DomProvider,
  types: BlockDefinitionProvider,
): FieldsProvider {
  const fieldCache = new Map<string, BlokkliFieldElement>()

  function find(
    uuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined {
    const key = uuid + ':' + fieldName
    const cached = fieldCache.get(key)
    if (cached) {
      return cached
    }

    const registeredField = dom.getRegisteredField(uuid, fieldName)
    if (!registeredField) {
      return
    }
    const definition = types.getFieldConfig(
      registeredField.entity.type,
      registeredField.entity.bundle,
      registeredField.fieldName,
    )
    if (!definition) {
      return
    }
    const fieldElement: BlokkliFieldElement = {
      key,
      name: registeredField.fieldName,
      label: definition.label,
      isNested: registeredField.isNested,
      nestingLevel: registeredField.nestingLevel,
      fieldListType: registeredField.fieldListType,
      hostEntityType: registeredField.entity.type,
      hostEntityBundle: registeredField.entity.bundle,
      hostEntityUuid: registeredField.entity.uuid,
      allowedBundles: definition.allowedBundles,
      allowedFragments: registeredField.allowedFragments,
      cardinality: definition.cardinality,
      element: registeredField.element,
      dropAlignment: registeredField.dropAlignment,
    }

    fieldCache.set(key, fieldElement)
    return fieldElement
  }

  onBlokkliEvent('state:reloaded', () => {
    fieldCache.clear()
  })

  return {
    find,
  }
}
