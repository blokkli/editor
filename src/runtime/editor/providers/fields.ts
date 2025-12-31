import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { BlokkliFieldElement } from '../types/field'
import type { DomProvider } from './dom'
import type { BlockDefinitionProvider } from './types'

export type FieldsProvider = {
  /**
   * Find a field element by host entity UUID and field name.
   *
   * Returns a BlokkliFieldElement with complete field metadata including:
   * - Field configuration (label, cardinality, allowed bundles)
   * - Host entity information
   * - Nesting level and field list type
   * - HTML element reference
   * - Drop alignment settings
   *
   * Results are cached and invalidated on state reload.
   *
   * @param uuid - The host entity UUID
   * @param fieldName - The name of the field
   * @returns The field element with metadata, or undefined if not found
   */
  find: (uuid: string, fieldName: string) => BlokkliFieldElement | undefined
}

export default function (
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
