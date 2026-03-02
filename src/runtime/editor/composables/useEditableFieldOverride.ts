import type { EntityContext } from '#blokkli/types'
import { useBlokkli } from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import type { PropsFieldMapping } from './../../../global/types/definitions'

export type EditableFieldOverride = {
  /** The resolved DOM element, or null if not found. */
  element: HTMLElement | null
  /** The original value captured when the override was created. */
  originalValue: string
  /** The field type (plain or markup). */
  fieldType: 'plain' | 'markup'
  /** Apply a value — updates live preview via the correct strategy. */
  setValue(value: string): void
  /** Apply pre-built diff HTML (with <ins>/<del> tags) to the DOM element. */
  setDiffHtml(html: string): void
  /** Restore the original value (shorthand for setValue(originalValue)). */
  restore(): void
}

const NOOP_OVERRIDE: EditableFieldOverride = {
  element: null,
  originalValue: '',
  fieldType: 'plain',
  setValue() {},
  setDiffHtml() {},
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
  const { eventBus, state, types, definitions, directive, fieldValue } =
    useBlokkli()

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
    mapping: Record<string, PropsFieldMapping | null>,
  ): string | null {
    return (
      Object.entries(mapping).find(
        ([_prop, propMapping]) =>
          propMapping?.name === fieldName && propMapping.type === 'editable',
      )?.[0] ?? null
    )
  }

  const providerDefinition = definitions.getProviderDefinition(
    host.type,
    host.bundle,
  )

  let matchingProp: string | null = null
  if (host.type === itemEntityType) {
    const defintion = definitions.getBlockDefinition(host.bundle, 'default')
    if (defintion?.propsFieldMapping) {
      matchingProp = findMatchingProp(defintion.propsFieldMapping)
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

  // Capture original value using the shared provider method.
  const readResult = fieldValue.readFieldValue(fieldName, host)
  const originalValue = readResult?.value ?? ''

  // Capture original mutatedItemProps value for restore.
  const originalMutatedProp: string | undefined =
    usesMutatedProps && matchingProp
      ? state.mutatedItemProps[mutatedItemPropsKey]?.[matchingProp]
      : undefined

  function setValue(value: string): void {
    element.removeAttribute('data-bk-diff-active')

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

  function setDiffHtml(html: string): void {
    element.setAttribute('data-bk-diff-active', '')
    // Always use innerHTML directly, bypassing reactive state (mutatedItemProps
    // / component events).  This avoids the problem where components using
    // v-text would escape the <ins>/<del> tags.  Because no reactive state is
    // changed, Vue won't re-render and overwrite the DOM during the approval
    // phase.
    element.innerHTML = html

    // Mark the block as dirty so that the state provider forces a re-render
    // after the next mutation, fixing the VDOM/DOM mismatch we just created.
    state.markDirty(host.uuid)
  }

  function restore(): void {
    // Check if setDiffHtml was used — it writes directly to innerHTML bypassing
    // reactive state, so we must also restore the DOM directly.
    const wasDiffActive = element.hasAttribute('data-bk-diff-active')
    element.removeAttribute('data-bk-diff-active')

    if (usesMutatedProps && matchingProp) {
      const propsObj = state.mutatedItemProps[mutatedItemPropsKey]
      if (propsObj) {
        if (originalMutatedProp === undefined) {
          Reflect.deleteProperty(propsObj, matchingProp)
          // Only remove the entire object if no other overrides remain.
          if (Object.keys(propsObj).length === 0) {
            state.mutatedItemProps[mutatedItemPropsKey] = undefined
          }
        } else {
          propsObj[matchingProp] = originalMutatedProp
        }
      }

      // setDiffHtml bypasses mutatedItemProps entirely, so restoring the prop
      // alone doesn't trigger a re-render. Force the DOM back to the original.
      if (wasDiffActive) {
        if (isMarkup) {
          element.innerHTML = originalValue
        } else {
          element.textContent = originalValue
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
    setDiffHtml,
    restore,
  }
}
