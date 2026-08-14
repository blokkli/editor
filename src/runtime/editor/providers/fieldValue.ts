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
  entityType: string
  entityBundle: string
}

/**
 * A droppable field value (ordered list of referenced entity IDs currently in
 * the field) as provided by the adapter's mapped state.
 */
export type DroppableFieldValue = {
  uuid: string
  fieldName: string
  ids: string[]
  entityType: string
  entityBundle: string
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
   * Read the RAW (unprocessed) value of an editable field — what is actually
   * stored in the backend, not what the page renders.
   *
   * A CMS renders text fields through filters (text formats, typographic
   * transforms, "opens in a new tab" markers on external links), so the
   * rendered value differs from the stored one. Anything that can end up being
   * written back — an agent edit, a diff base, a search/replace target — MUST
   * use this rather than `readValue`, or the filter's output gets persisted as
   * if it were authored content and compounds on the next render.
   *
   * Resolves from the adapter's `textFieldValues` (mapped state), falling back
   * to `readValue` only when the adapter exposes nothing for that entity.
   *
   * Imperative use only: the mapped state lives outside Vue's reactivity, so a
   * `computed()` built on this will not re-evaluate when the state is re-mapped.
   */
  readRawValue: (
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

  /**
   * Get all droppable field values (item counts) from the mapped state.
   * Returns an empty array when the adapter hasn't populated this.
   */
  getDroppableFieldValues: () => DroppableFieldValue[]

  /**
   * Get the current number of items in a droppable field.
   * Reads from mapped state; returns 0 when the adapter hasn't populated it.
   */
  getDroppableFieldCount: (fieldName: string, host: EntityContext) => number

  /**
   * Get the ordered list of referenced entity IDs currently in a droppable
   * field. Reads from mapped state; returns an empty array when the adapter
   * hasn't populated it.
   */
  getDroppableFieldIds: (fieldName: string, host: EntityContext) => string[]
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

    // propsFieldMapping resolves the value directly off the block's props /
    // entity state — no DOM element required. Try this BEFORE asking the
    // directive registry for an element, so a field declared purely via
    // `propsFieldMapping` (no `v-blokkli-editable` directive in the template)
    // still resolves to its current value.
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

    if (matchingProp) {
      const propValue = providerDefinition
        ? state.mutatedEntity.value[matchingProp]
        : state.getFieldListItem(host.uuid)?.props?.[matchingProp]

      // A field name is a property path. `link.title` resolves to prop `link`,
      // then the `title` property inside it.
      const dotIndex = fieldName.indexOf('.')
      if (dotIndex !== -1) {
        const property = fieldName.slice(dotIndex + 1)
        const nested =
          propValue && typeof propValue === 'object'
            ? (propValue as Record<string, unknown>)[property]
            : undefined
        return { value: typeof nested === 'string' ? nested : '', fieldType }
      }

      return { value: propValue || '', fieldType }
    }

    // No propsFieldMapping — fall back to reading from the directive-bound
    // DOM element (or its component getter).
    const element = directive.findEditableElement(fieldName, host)
    if (!element) {
      return null
    }

    const editableData = directive.findEditable(fieldName, host)
    const isMarkup = cfg.type !== 'plain'
    const isComponent = !!editableData?.isComponent

    let value: string
    if (isComponent && editableData?.getValue) {
      value = editableData.getValue()
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

  /**
   * The adapter's raw values, or null before any state has been mapped.
   *
   * `getMappedState()` throws when called before a state is available, and
   * `readRawValue` can run during component setup — so this swallows that case
   * rather than letting it propagate to a caller that only wants a string.
   */
  function getRawFieldValues(): TextFieldValue[] | null {
    try {
      const values = state.getMappedState().textFieldValues
      // An empty array means the adapter exposed nothing, exactly like omitting
      // the key: the Drupal adapter maps missing data to `[]`. Accepting it as
      // "raw values are available" would silently serve every field from the
      // rendered DOM, with no warning, in the adapter this exists to protect.
      return values?.length ? values : null
    } catch {
      return null
    }
  }

  /**
   * Whether the mapped state walked this entity's fields at all.
   *
   * Adapters emit one row per NON-EMPTY field, so the absence of rows for an
   * entity says nothing about whether the adapter covers it — a block whose
   * text fields happen to all be empty contributes none. Coverage has to be
   * decided from the state tree instead.
   */
  function entityIsCovered(entityType: string, uuid: string): boolean {
    // The host entity is always part of the state the adapter maps.
    if (entityType !== itemEntityType) {
      return true
    }
    return !!state.getFieldListItem(uuid)
  }

  /** True once we've warned about an adapter that exposes no raw values. */
  let warnedMissingRawValues = false

  function readRawValue(
    entityType: string,
    uuid: string,
    bundle: string,
    fieldName: string,
    fieldType: FieldValueType,
  ): string {
    const values = getRawFieldValues()

    if (!values) {
      if (import.meta.dev && !warnedMissingRawValues) {
        warnedMissingRawValues = true
        console.warn(
          '[blökkli] The adapter exposes no `textFieldValues`, so raw field ' +
            'values fall back to the rendered ones. Any text the agent writes ' +
            'back will carry whatever the backend injected while rendering.',
        )
      }
      return readValue(entityType, uuid, bundle, fieldName, fieldType)
    }

    for (let i = 0; i < values.length; i++) {
      const v = values[i]!
      if (v.uuid === uuid && v.entityType === entityType) {
        if (v.fieldName === fieldName) {
          return v.value
        }
      }
    }

    // No row for this field. Adapters omit fields with no value, so for an
    // entity the adapter covers this means the field is genuinely empty.
    // Falling back would hand back a rendered placeholder — or filter-injected
    // markup — as if a human had authored it.
    if (entityIsCovered(entityType, uuid)) {
      return ''
    }

    // The mapped state never walked this entity, so there is no raw value to
    // be had. Nothing better than the rendered one.
    return readValue(entityType, uuid, bundle, fieldName, fieldType)
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
              entityType: itemEntityType,
              entityBundle: item.bundle,
            })
          }
        }
      }
    }

    return values
  }

  function getDroppableFieldValues(): DroppableFieldValue[] {
    const mappedState = state.getMappedState()
    return mappedState.droppableFieldValues ?? []
  }

  function getDroppableFieldIds(
    fieldName: string,
    host: EntityContext,
  ): string[] {
    const values = getDroppableFieldValues()
    for (let i = 0; i < values.length; i++) {
      const v = values[i]!
      if (
        v.uuid === host.uuid &&
        v.fieldName === fieldName &&
        v.entityType === host.type
      ) {
        return v.ids
      }
    }
    return []
  }

  function getDroppableFieldCount(
    fieldName: string,
    host: EntityContext,
  ): number {
    return getDroppableFieldIds(fieldName, host).length
  }

  return {
    resolveFieldType,
    readValue,
    readRawValue,
    readFieldValue,
    getTextFieldValues,
    getDroppableFieldValues,
    getDroppableFieldCount,
    getDroppableFieldIds,
  }
}
