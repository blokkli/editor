import type { EntityContext } from '#blokkli/types'
import { itemEntityType } from '#blokkli-build/config'
import type { PropsFieldMapping } from '../../../global/types/definitions'
import type { DefinitionProvider } from './definition'
import type { DirectiveProvider } from './directive'
import type { StateProvider } from './state'
import type { BlockDefinitionProvider } from './types'
import type { BlocksProvider } from './blocks'

/**
 * Simplified field type for editable fields.
 */
export type FieldValueType = 'plain' | 'markup'

/**
 * A text field value as provided by the adapter or directive system.
 */
export type TextFieldValue = {
  uuid: string
  fieldName: string
  value: string
  fieldType: FieldValueType
}

/**
 * The result of reading a field value.
 */
export type ReadFieldValueResult = {
  value: string
  fieldType: FieldValueType
}

export type FieldValueProvider = {
  /**
   * Resolve an editable field config to its simplified type.
   * Returns 'plain' for text fields, 'markup' for rich text/frame fields, null for unsupported.
   */
  resolveFieldType: (
    entityType: string,
    bundle: string,
    fieldName: string,
  ) => FieldValueType | null

  /**
   * Read the current value of an editable field on a block or entity.
   * Tries the registered getValue() callback first, falls back to DOM element reading.
   */
  readValue: (
    entityType: string,
    uuid: string,
    bundle: string,
    fieldName: string,
    fieldType: FieldValueType,
  ) => string

  /**
   * Read the current value and field type of an editable field.
   *
   * Uses the correct strategy based on the field's configuration:
   * 1. Component editables — use getValue() callback
   * 2. Mutated props — read from mutatedItemProps or mutatedEntity
   * 3. Direct DOM — read innerHTML (markup) or textContent (plain)
   */
  readFieldValue: (
    fieldName: string,
    host: EntityContext,
  ) => ReadFieldValueResult | null

  /**
   * Get all text field values from the page.
   * Reads from mapped state if available, falls back to reading from directive system.
   */
  getTextFieldValues: () => TextFieldValue[]
}

export default function fieldValueProvider(
  directive: DirectiveProvider,
  state: StateProvider,
  types: BlockDefinitionProvider,
  definitions: DefinitionProvider,
  blocks: BlocksProvider,
): FieldValueProvider {
  function resolveFieldType(
    entityType: string,
    bundle: string,
    fieldName: string,
  ): FieldValueType | null {
    const config = types.editableFieldConfig.forName(
      entityType,
      bundle,
      fieldName,
    )
    if (!config) return null
    if (config.type === 'table') return null
    if (config.type === 'frame' || config.type === 'markup') return 'markup'
    return 'plain'
  }

  function findMatchingProp(
    mapping: Record<string, PropsFieldMapping | null>,
    fieldName: string,
  ): string | null {
    return (
      Object.entries(mapping).find(
        ([_prop, propMapping]) =>
          propMapping?.name === fieldName && propMapping.type === 'editable',
      )?.[0] ?? null
    )
  }

  function readFieldValue(
    fieldName: string,
    host: EntityContext,
  ): ReadFieldValueResult | null {
    const element = directive.findEditableElement(fieldName, host)
    if (!element) {
      return null
    }

    const editableData = directive.findEditable(fieldName, host)

    const cfg = types.editableFieldConfig.forName(
      host.type,
      host.bundle,
      fieldName,
    )
    if (!cfg || cfg.type === 'table') {
      return null
    }

    const fieldType: FieldValueType =
      cfg.type === 'frame' || cfg.type === 'markup' ? 'markup' : 'plain'
    const isMarkup = cfg.type !== 'plain'
    const isComponent = !!editableData?.isComponent

    // Determine if this field uses mutated props.
    const providerDefinition = definitions.getProviderDefinition(
      host.type,
      host.bundle,
    )

    let matchingProp: string | null = null
    if (host.type === itemEntityType) {
      const block = blocks.getBlock(host.uuid)
      const definition = definitions.getBlockDefinition(
        host.bundle,
        block?.fieldListType ?? 'default',
        block?.parentBlockBundle ?? null,
      )
      if (definition?.propsFieldMapping) {
        matchingProp = findMatchingProp(definition.propsFieldMapping, fieldName)
      }
    } else if (providerDefinition) {
      const mapping = providerDefinition.propsFieldMapping
      if (mapping) {
        matchingProp = findMatchingProp(mapping, fieldName)
      }
    }

    // Read the value using the correct strategy.
    let value: string
    if (isComponent && editableData?.getValue) {
      value = editableData.getValue()
    } else if (matchingProp) {
      if (providerDefinition) {
        value = state.mutatedEntity.value[matchingProp] || ''
      } else {
        value = state.getFieldListItem(host.uuid)?.props?.[matchingProp] ?? ''
      }
    } else if (isMarkup) {
      value = element.innerHTML
    } else {
      value = element.textContent || ''
    }

    return { value, fieldType }
  }

  function readValue(
    entityType: string,
    uuid: string,
    bundle: string,
    fieldName: string,
    fieldType: FieldValueType,
  ): string {
    const result = readFieldValue(fieldName, {
      type: entityType,
      uuid,
      bundle,
    })
    if (result) {
      return result.value
    }

    // Fallback: try direct DOM read with the provided fieldType.
    const element = directive.findEditableElement(fieldName, {
      type: entityType,
      uuid,
      bundle,
    })
    if (element) {
      return fieldType === 'markup'
        ? element.innerHTML || ''
        : element.textContent || ''
    }

    return ''
  }

  function getTextFieldValues(): TextFieldValue[] {
    // Read from mapped state if available (provided by adapter's mapState).
    const mappedState = state.getMappedState()
    if (mappedState.textFieldValues) {
      return mappedState.textFieldValues
    }

    // Fallback: read from directive system using field configs.
    const values: TextFieldValue[] = []
    const fields = state.mutatedFields.value
    for (const field of fields) {
      for (const item of field.list) {
        const configs = types.editableFieldConfig.forEntityTypeAndBundle(
          itemEntityType,
          item.bundle,
        )
        for (const config of configs) {
          const result = readFieldValue(config.name, {
            type: itemEntityType,
            uuid: item.uuid,
            bundle: item.bundle,
          })
          if (result && result.value.trim()) {
            values.push({
              uuid: item.uuid,
              fieldName: config.name,
              value: result.value,
              fieldType: result.fieldType,
            })
          }
        }
      }
    }

    return values
  }

  return {
    resolveFieldType,
    readValue,
    readFieldValue,
    getTextFieldValues,
  }
}
