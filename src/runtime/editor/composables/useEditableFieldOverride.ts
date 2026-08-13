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
 * Resolves the update strategy and returns methods to set/restore the field
 * value. Exactly ONE of two mutually exclusive strategies is used:
 *
 * - **DOM-based** (field element found via the editable directive): live
 *   preview through the element, including diff markup via `setDiffHtml`.
 * - **Props-based** (no element, but the field is declared in the block's
 *   `propsFieldMapping`): values are written to `mutatedItemProps` and flow
 *   reactively into the component's props. No DOM is touched and diff markup
 *   cannot render (`setDiffHtml` is a no-op) — only real values.
 *
 * If neither strategy applies or the field type is unsupported (e.g.
 * 'table'), returns a no-op override with empty values.
 */
export function useEditableFieldOverride(
  fieldName: string,
  host: EntityContext,
): EditableFieldOverride {
  const { eventBus, state, types, definitions, directive, fieldValue, blocks } =
    useBlokkli()

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

  // Determine the props mapping (element-independent).
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

  // Capture original value using the shared provider method.
  const readResult = fieldValue.readFieldValue(fieldName, host)
  const originalValue = readResult?.value ?? ''

  // Capture original mutatedItemProps value for restore.
  const originalMutatedProp: string | undefined = matchingProp
    ? state.mutatedItemProps[mutatedItemPropsKey]?.[matchingProp]
    : undefined

  /** Write a value into the block's mutated props (reactive re-render). */
  function setMutatedProp(value: string): void {
    if (!matchingProp) return
    if (!state.mutatedItemProps[mutatedItemPropsKey]) {
      state.mutatedItemProps[mutatedItemPropsKey] = {}
    }
    state.mutatedItemProps[mutatedItemPropsKey]![matchingProp] = value
  }

  /** Undo the mutated-props write, re-instating any pre-existing override. */
  function restoreMutatedProp(): void {
    if (!matchingProp) return
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

  // Resolve the element and editable data.
  const el = directive.findEditableElement(fieldName, host)
  if (!el) {
    // Props-based strategy: the field is not rendered with the editable
    // directive, but its value flows into the component via propsFieldMapping.
    // Everything goes through the reactive prop — the DOM is never touched.
    if (!matchingProp) {
      return NOOP_OVERRIDE
    }
    return {
      element: null,
      originalValue,
      fieldType,
      setValue: setMutatedProp,
      // Diff markup needs an element to render into; a prop can only carry a
      // real value (the component may escape it, e.g. via v-text).
      setDiffHtml() {},
      restore: restoreMutatedProp,
    }
  }
  // Re-assign after guard so TypeScript knows it's defined inside closures.
  const element: HTMLElement = el

  const editableData = directive.findEditable(fieldName, host)
  const isComponent = !!editableData?.isComponent
  const usesMutatedProps = !!matchingProp
  const usesDirectDom = !isComponent && !matchingProp

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

    if (usesMutatedProps) {
      setMutatedProp(value)
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
    if (usesMutatedProps) {
      restoreMutatedProp()
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
