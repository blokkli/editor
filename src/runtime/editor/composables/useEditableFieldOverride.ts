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
  const { eventBus, state, types, definitions, directive, fieldValue, blocks } =
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
    const block = blocks.getBlock(host.uuid)
    const defintion = definitions.getBlockDefinition(
      host.bundle,
      block?.fieldListType ?? 'default',
      block?.parentBlockBundle ?? null,
    )
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

  // The element's Vue-managed child nodes, captured when a diff preview is
  // applied. We keep the live node objects (not a clone) so that re-inserting
  // them in restore() preserves Vue's vnode → element references — a fresh
  // textContent/innerHTML write would detach them and silently break the next
  // inline edit (Vue would patch a node no longer in the document).
  let savedNodes: ChildNode[] | null = null

  /**
   * Re-insert the preserved original child nodes, undoing a diff preview without
   * destroying Vue's node identity. Returns true if a diff was actually undone.
   */
  function reattachOriginalNodes(): boolean {
    if (savedNodes) {
      element.replaceChildren(...savedNodes)
      savedNodes = null
      return true
    }
    return false
  }

  function setValue(value: string): void {
    // If a diff preview is active, put the originals back first so the reactive/
    // DOM write below targets the live, Vue-tracked nodes.
    reattachOriginalNodes()
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
    // Preserve the Vue-managed children before overwriting, but only on the
    // transition into a diff (don't capture the diff markup itself on re-apply).
    if (!element.hasAttribute('data-bk-diff-active')) {
      savedNodes = Array.from(element.childNodes)
    }
    element.setAttribute('data-bk-diff-active', '')
    // Use innerHTML directly so the <ins>/<del> tags render as markup rather than
    // being escaped by a v-text binding. The original nodes live on in
    // `savedNodes` and are re-inserted verbatim by restore(), so Vue's vnode
    // references survive and there is no VDOM/DOM mismatch to repair afterwards.
    element.innerHTML = html
  }

  function restore(): void {
    const wasDiffActive = element.hasAttribute('data-bk-diff-active')
    element.removeAttribute('data-bk-diff-active')

    // Diff-preview path: re-insert the exact original nodes. This restores the
    // DOM *and* Vue's node identity, so subsequent reactive patches (e.g. inline
    // edits) land on live nodes. setDiffHtml never touched mutatedItemProps, so
    // there is nothing else to undo here.
    if (wasDiffActive && reattachOriginalNodes()) {
      return
    }

    // setValue path: undo the live-preview write via the same strategy used to
    // apply it.
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
