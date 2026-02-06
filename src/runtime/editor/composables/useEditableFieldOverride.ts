import type { EntityContext } from '#blokkli/types'
import { useBlokkli } from '#imports'
import { FIELD_MAPPING } from '#blokkli-build/runtime-options'
import { itemEntityType } from '#blokkli-build/config'

export type EditableFieldOverride = {
  /** The resolved DOM element, or null if not found. */
  element: HTMLElement | null
  /** The original value captured when the override was created. */
  originalValue: string
  /** The field type (plain or markup). */
  fieldType: 'plain' | 'markup'
  /** Apply a value — updates live preview via the correct strategy. */
  setValue(value: string): void
  /** Restore the original value (shorthand for setValue(originalValue)). */
  restore(): void
}

const NOOP_OVERRIDE: EditableFieldOverride = {
  element: null,
  originalValue: '',
  fieldType: 'plain',
  setValue() {},
  restore() {},
}

/**
 * Create an override for an editable field.
 *
 * Resolves the element and determines the correct update strategy
 * (direct DOM, mutatedItemProps, or component event), captures the
 * original value, and returns methods to set/restore the field value.
 *
 * If the field element is not found or the field type is unsupported
 * (e.g. 'table'), returns a no-op override with empty values.
 */
export function useEditableFieldOverride(
  fieldName: string,
  host: EntityContext,
): EditableFieldOverride {
  const { eventBus, state, types, definitions, directive } = useBlokkli()

  // Resolve the element and editable data.
  const el = directive.findEditableElement(fieldName, host)
  if (!el) {
    return NOOP_OVERRIDE
  }
  // Re-assign after guard so TypeScript knows it's defined inside closures.
  const element: HTMLElement = el

  const editableData = directive.findEditable(fieldName, host)

  // Get field config.
  const cfg = types.editableFieldConfig.forName(
    host.type,
    host.bundle,
    fieldName,
  )
  if (!cfg || cfg.type === 'table') {
    return NOOP_OVERRIDE
  }
  const config = cfg

  const fieldType: 'plain' | 'markup' =
    config.type === 'frame' || config.type === 'markup' ? 'markup' : 'plain'
  const isMarkup = config.type !== 'plain'
  const isComponent = !!editableData?.isComponent

  // Determine update strategy.
  function findMatchingProp(
    mapping: Record<string, string>,
  ): string | null {
    return (
      Object.entries(mapping).find(
        ([_prop, field]) => field === fieldName,
      )?.[0] ?? null
    )
  }

  const providerDefinition = definitions.getProviderDefinition(
    host.type,
    host.bundle,
  )

  let matchingProp: string | null = null
  if (host.type === itemEntityType) {
    const mapping = FIELD_MAPPING[host.bundle]
    if (mapping) {
      matchingProp = findMatchingProp(mapping)
    }
  } else if (providerDefinition) {
    const mapping = providerDefinition.propsFieldMapping
    if (mapping) {
      matchingProp = findMatchingProp(mapping)
    }
  }

  const mutatedItemPropsKey = providerDefinition ? 'HOST' : host.uuid
  const usesMutatedProps = !!matchingProp
  const usesDirectDom = !isComponent && !matchingProp

  // Capture original value.
  let originalValue: string
  if (isComponent) {
    originalValue = editableData?.getValue ? editableData.getValue() : ''
  } else if (usesMutatedProps && matchingProp) {
    if (providerDefinition) {
      originalValue = state.mutatedEntity.value[matchingProp] || ''
    } else {
      originalValue =
        state.getFieldListItem(host.uuid)?.props?.[matchingProp] ?? ''
    }
  } else if (isMarkup) {
    originalValue = element.innerHTML
  } else {
    originalValue = element.textContent || ''
  }

  // Capture original mutatedItemProps value for restore.
  const originalMutatedProp: string | undefined =
    usesMutatedProps && matchingProp
      ? state.mutatedItemProps[mutatedItemPropsKey]?.[matchingProp]
      : undefined

  function setValue(value: string): void {
    if (usesMutatedProps && matchingProp) {
      if (!state.mutatedItemProps[mutatedItemPropsKey]) {
        state.mutatedItemProps[mutatedItemPropsKey] = {}
      }
      state.mutatedItemProps[mutatedItemPropsKey]![matchingProp] = value
    }

    if (usesDirectDom) {
      if (config.type === 'plain') {
        element.textContent = value
      } else {
        element.innerHTML = value
      }
    }

    if (isComponent) {
      eventBus.emit('editable:update', {
        name: fieldName,
        entityUuid: host.uuid,
        value,
      })
    }
  }

  function restore(): void {
    if (usesMutatedProps && matchingProp) {
      if (originalMutatedProp === undefined) {
        if (state.mutatedItemProps[mutatedItemPropsKey]) {
          state.mutatedItemProps[mutatedItemPropsKey] = undefined
        }
      } else {
        if (state.mutatedItemProps[mutatedItemPropsKey]) {
          state.mutatedItemProps[mutatedItemPropsKey]![matchingProp] =
            originalMutatedProp
        }
      }
    }

    if (usesDirectDom) {
      if (isMarkup) {
        element.innerHTML = originalValue
      } else {
        element.textContent = originalValue
      }
    }

    if (isComponent) {
      eventBus.emit('editable:update', {
        name: fieldName,
        entityUuid: host.uuid,
        value: originalValue,
      })
    }
  }

  return {
    element,
    originalValue,
    fieldType,
    setValue,
    restore,
  }
}
