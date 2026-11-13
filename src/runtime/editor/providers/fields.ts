import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { BlokkliFieldElement, RegisteredField } from '../types/field'
import type { DomProvider } from './dom'
import type { BlockDefinitionProvider } from './types'
import type { StateProvider } from './state'

type FieldInfo = { zIndex: number; element: HTMLElement } | null

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
   * Results are cached and invalidated on state reload, and when the field
   * registers again: inside a block that a field in proxy mode shows anew, it
   * has another element.
   *
   * @param uuid - The host entity UUID
   * @param fieldName - The name of the field
   * @returns The field element with metadata, or undefined if not found
   */
  find: (uuid: string, fieldName: string) => BlokkliFieldElement | undefined

  /**
   * Get the z-index of the field containing the given block UUID.
   *
   * @param uuid - The block UUID
   * @returns The z-index of the field, or 0 if not found
   */
  getFieldZIndex: (uuid: string) => number

  /**
   * Compare field priority between two blocks.
   * Returns > 0 if uuidA wins, < 0 if uuidB wins, 0 if equal.
   * Uses z-index as primary sort, DOM order as tiebreaker.
   *
   * @param uuidA - First block UUID
   * @param uuidB - Second block UUID
   * @returns Comparison result
   */
  compareFieldPriority: (uuidA: string, uuidB: string) => number
}

export default function (
  dom: DomProvider,
  types: BlockDefinitionProvider,
  state: StateProvider,
): FieldsProvider {
  // Each field with the registration it was built from. A field that is no
  // longer registered keeps its entry.
  const fieldCache = new Map<
    string,
    { registered: RegisteredField; field: BlokkliFieldElement }
  >()
  const fieldInfoCache = new Map<string, FieldInfo>()
  const comparisonCache = new Map<string, number>()

  function find(
    uuid: string,
    fieldName: string,
  ): BlokkliFieldElement | undefined {
    const key = uuid + ':' + fieldName
    const registeredField = dom.getRegisteredField(uuid, fieldName)
    const cached = fieldCache.get(key)
    if (cached && (!registeredField || cached.registered === registeredField)) {
      return cached.field
    }

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
      isPager: registeredField.isPager,
    }

    fieldCache.set(key, { registered: registeredField, field: fieldElement })
    return fieldElement
  }

  function getFieldInfo(uuid: string): FieldInfo {
    const cached = fieldInfoCache.get(uuid)

    if (cached !== undefined) {
      return cached
    }

    const fieldKey = state.getFieldKeyForUuid(uuid)
    if (!fieldKey) {
      fieldInfoCache.set(uuid, null)
      return null
    }
    const separatorIndex = fieldKey.indexOf(':')
    const entityUuid = fieldKey.substring(0, separatorIndex)
    const fieldName = fieldKey.substring(separatorIndex + 1)
    const field = dom.getRegisteredField(entityUuid, fieldName)
    const info = field ? { zIndex: field.zIndex, element: field.element } : null
    fieldInfoCache.set(uuid, info)
    return info
  }

  function getFieldZIndex(uuid: string): number {
    return getFieldInfo(uuid)?.zIndex ?? 0
  }

  function compareFieldPriority(uuidA: string, uuidB: string): number {
    const cacheKey = uuidA + '\0' + uuidB
    const cached = comparisonCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const fieldA = getFieldInfo(uuidA)
    const fieldB = getFieldInfo(uuidB)
    const zIndexA = fieldA?.zIndex ?? 0
    const zIndexB = fieldB?.zIndex ?? 0

    let result = 0
    if (zIndexA !== zIndexB) {
      result = zIndexA - zIndexB
    } else {
      // Same z-index: later in DOM wins (matches natural paint order).
      const elA = fieldA?.element
      const elB = fieldB?.element
      if (elA && elB && elA !== elB) {
        const position = elA.compareDocumentPosition(elB)
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) result = -1
        else if (position & Node.DOCUMENT_POSITION_PRECEDING) result = 1
      }
    }

    comparisonCache.set(cacheKey, result)
    return result
  }

  onBlokkliEvent('state:reloaded', () => {
    fieldCache.clear()
    fieldInfoCache.clear()
    comparisonCache.clear()
  })

  return {
    find,
    getFieldZIndex,
    compareFieldPriority,
  }
}
