import type { AdaptersProvider } from './adapters'
import type { DirectiveProvider } from './directive'
import type { StateProvider } from './state'
import type { BlockDefinitionProvider } from './types'
// Side-effect import to register adapter type augmentation.
import './fieldValueAdapterTypes'

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
   * Get all text field values from the page.
   * Tries the adapter method first, falls back to reading from directive system.
   */
  getTextFieldValues: () => Promise<TextFieldValue[]>
}

export default function fieldValueProvider(
  adapters: AdaptersProvider,
  directive: DirectiveProvider,
  state: StateProvider,
  types: BlockDefinitionProvider,
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

  function readValue(
    entityType: string,
    uuid: string,
    bundle: string,
    fieldName: string,
    fieldType: FieldValueType,
  ): string {
    const editables = directive.getEditablesForBlock(uuid)
    const editable = editables.find((e) => e.fieldName === fieldName)

    if (editable?.getValue) {
      return editable.getValue()
    }

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

  async function getTextFieldValues(): Promise<TextFieldValue[]> {
    // Try the adapter method first.
    const adapter = adapters.adapter
    if (adapter.getTextFieldValues) {
      return adapter.getTextFieldValues()
    }

    // Fallback: read from directive system.
    const values: TextFieldValue[] = []
    const fields = state.mutatedFields.value
    for (const field of fields) {
      for (const item of field.list) {
        const editables = directive.getEditablesForBlock(item.uuid)
        for (const editable of editables) {
          if (editable.getValue) {
            const value = editable.getValue()
            if (value && value.trim()) {
              values.push({
                uuid: item.uuid,
                fieldName: editable.fieldName,
                value,
                fieldType:
                  editable.directiveType === 'editable' ? 'markup' : 'plain',
              })
            }
          }
        }
      }
    }

    return values
  }

  return {
    resolveFieldType,
    readValue,
    getTextFieldValues,
  }
}
