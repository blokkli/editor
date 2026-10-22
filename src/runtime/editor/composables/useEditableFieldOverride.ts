import type { EntityContext } from '#blokkli/types'
import { useBlokkli } from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import { sanitizeHtml } from '#blokkli/editor/helpers/html'
import type { PropsFieldMapping } from './../../../global/types/definitions'

export type EditableFieldOverride = {
  /** The resolved DOM element, or null if not found. */
  element: HTMLElement | null
  /**
   * The original value captured when the override was created, as RENDERED.
   *
   * Use this only to put the page back the way it was — `restore()` writes it
   * straight into the DOM. It is NOT what is stored: a CMS renders text fields
   * through filters, so this can carry markup nobody authored.
   */
  originalValue: string
  /**
   * The original value as STORED — the backend's raw value, before any render
   * filters ran.
   *
   * Use this for anything that computes a diff or can be written back
   * (`splitIntoSegments`, `computeDiff`, change detection). Diffing against
   * `originalValue` marks every filter artifact as a change, and reassembling a
   * partially-accepted diff would then persist that rendered markup.
   */
  rawOriginalValue: string
  /** The field type (plain or markup). */
  fieldType: 'plain' | 'markup'
  /**
   * Apply a value — updates live preview via the correct strategy. A formatted
   * field's value is sanitised first: the preview shows its markup, but never
   * runs it.
   */
  setValue(value: string): void
  /**
   * Apply pre-built diff HTML (with <ins>/<del> tags) to the DOM element,
   * sanitised.
   */
  setDiffHtml(html: string): void
  /** Restore the original value (shorthand for setValue(originalValue)). */
  restore(): void
  /**
   * Hand the field back to its component once the value is stored: re-inserts
   * the nodes a direct write replaced, into which Vue has rendered the stored
   * value. The other strategies reset themselves with the new state.
   */
  release(): void
}

const NOOP_OVERRIDE: EditableFieldOverride = {
  element: null,
  originalValue: '',
  rawOriginalValue: '',
  fieldType: 'plain',
  setValue() {},
  setDiffHtml() {},
  restore() {},
  release() {},
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

  /**
   * A value as the page shows it. Markup is sanitised: it's the raw stored
   * value or one nobody has approved yet (plans/xss, X4).
   */
  function toShown(value: string): string {
    return fieldType === 'markup' ? sanitizeHtml(value, 'richText') : value
  }

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

  // Capture original value using the shared provider method. This is the
  // RENDERED value — `restore()` writes it straight back into the DOM, so it
  // has to be exactly what was on screen.
  const readResult = fieldValue.readFieldValue(fieldName, host)
  const originalValue = readResult?.value ?? ''

  // The stored counterpart, for anything that computes a diff or gets written
  // back. See the type docs for why the two must not be conflated.
  const rawOriginalValue = fieldValue.readRawValue(
    host.type,
    host.uuid,
    host.bundle,
    fieldName,
    fieldType,
  )

  // Capture original mutatedItemProps value for restore. Always the WHOLE prop
  // value, even when only one property of it is edited, so restoring puts the
  // structure back exactly as it was.
  const originalMutatedProp: unknown = matchingProp
    ? state.mutatedItemProps[mutatedItemPropsKey]?.[matchingProp]
    : undefined

  // The property inside the prop that this field addresses, if any. A field
  // name is a property path: `link.title` means prop `link`, property `title`.
  const dotIndex = fieldName.indexOf('.')
  const propProperty = dotIndex === -1 ? null : fieldName.slice(dotIndex + 1)

  /** The committed prop value, i.e. what the block renders without overrides. */
  function readCommittedProp(): unknown {
    if (!matchingProp) return undefined
    return providerDefinition
      ? state.mutatedEntity.value[matchingProp]
      : state.getFieldListItem(host.uuid)?.props?.[matchingProp]
  }

  /** Write a value into the block's mutated props (reactive re-render). */
  function setMutatedProp(value: string): void {
    if (!matchingProp) return
    if (!state.mutatedItemProps[mutatedItemPropsKey]) {
      state.mutatedItemProps[mutatedItemPropsKey] = {}
    }
    const bucket = state.mutatedItemProps[mutatedItemPropsKey]!

    if (propProperty === null) {
      bucket[matchingProp] = value
      return
    }

    // Only one property of a structured value changed. Merge into the current
    // value rather than replacing it, or the siblings — a link's uri — would be
    // dropped for as long as the preview is active.
    const base = bucket[matchingProp] ?? readCommittedProp()
    bucket[matchingProp] = {
      ...(base && typeof base === 'object' ? base : {}),
      [propProperty]: value,
    }
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
      rawOriginalValue,
      fieldType,
      setValue: (value) => setMutatedProp(toShown(value)),
      // Diff markup needs an element to render into; a prop can only carry a
      // real value (the component may escape it, e.g. via v-text).
      setDiffHtml() {},
      restore: restoreMutatedProp,
      release() {},
    }
  }
  // Re-assign after guard so TypeScript knows it's defined inside closures.
  const element: HTMLElement = el

  const editableData = directive.findEditable(fieldName, host)
  const isComponent = !!editableData?.isComponent
  const usesMutatedProps = !!matchingProp
  const usesDirectDom = !isComponent && !matchingProp

  // The element's Vue-managed child nodes, captured before the first write that
  // replaces them (a diff preview, or a value written to the DOM directly). We
  // keep the live node objects (not a clone) so that re-inserting them in
  // restore() preserves Vue's vnode → element references — a fresh
  // textContent/innerHTML write would detach them for good, and every later
  // render (the stored value, an undo) would patch a node no longer in the
  // document, e.g. one rendered with `{{ title }}`.
  let savedNodes: ChildNode[] | null = null

  // The child nodes of the last write. If the element no longer holds them, its
  // component re-rendered it in the meantime (`v-text` and `v-html` replace the
  // children), and the saved nodes are outdated.
  let writtenNodes: ChildNode[] = []

  /** Write into the element, keeping Vue's nodes aside on the first write. */
  function writeDom(property: 'textContent' | 'innerHTML', value: string) {
    savedNodes ??= Array.from(element.childNodes)
    if (property === 'textContent') {
      element.textContent = value
    } else {
      // eslint-disable-next-line no-restricted-syntax -- a formatted field's value or a diff, sanitised
      element.innerHTML = value
    }
    writtenNodes = Array.from(element.childNodes)
  }

  /**
   * Re-insert the preserved original child nodes, undoing a write without
   * destroying Vue's node identity; unless the component re-rendered the
   * element since, which leaves it as it is. Returns true if a write was undone.
   */
  function reattachOriginalNodes(): boolean {
    if (!savedNodes) {
      return false
    }
    const current = element.childNodes
    const isWritten =
      current.length === writtenNodes.length &&
      writtenNodes.every((node, i) => current[i] === node)
    if (isWritten) {
      element.replaceChildren(...savedNodes)
    }
    savedNodes = null
    return true
  }

  function setValue(value: string): void {
    element.removeAttribute('data-bk-diff-active')

    if (usesDirectDom) {
      writeDom(
        fieldType === 'plain' ? 'textContent' : 'innerHTML',
        toShown(value),
      )
      return
    }

    // The reactive strategies patch Vue's nodes: if a diff preview is active,
    // put them back first.
    reattachOriginalNodes()

    if (usesMutatedProps) {
      setMutatedProp(toShown(value))
    }

    if (isComponent) {
      eventBus.emit('editable:update', {
        name: fieldName,
        entityUuid: host.uuid,
        value: toShown(value),
      })
    }
  }

  function setDiffHtml(html: string): void {
    element.setAttribute('data-bk-diff-active', '')
    // Use innerHTML directly so the <ins>/<del> tags render as markup rather than
    // being escaped by a v-text binding. The original nodes are kept aside once
    // (never the diff markup itself on re-apply, nor what another override wrote
    // in between, e.g. the editable overlay opened from the diff) and are
    // re-inserted verbatim by restore(), so Vue's vnode references survive and
    // there is no VDOM/DOM mismatch to repair afterwards.
    writeDom('innerHTML', sanitizeHtml(html, 'richText'))
  }

  function restore(): void {
    const wasDiffActive = element.hasAttribute('data-bk-diff-active')
    element.removeAttribute('data-bk-diff-active')

    // Re-insert the exact original nodes, if a diff preview or a direct write
    // replaced them. This restores the DOM *and* Vue's node identity, so
    // subsequent reactive patches (e.g. inline edits) land on live nodes. For
    // the direct DOM strategy that's all there is to undo; setDiffHtml never
    // touched mutatedItemProps either.
    const reattached = reattachOriginalNodes()
    if (usesDirectDom || (wasDiffActive && reattached)) {
      return
    }

    // setValue path: undo the live-preview write via the same strategy used to
    // apply it.
    if (usesMutatedProps) {
      restoreMutatedProp()
    }

    if (isComponent) {
      eventBus.emit('editable:update', {
        name: fieldName,
        entityUuid: host.uuid,
        value: originalValue,
      })
    }
  }

  function release(): void {
    if (usesDirectDom) {
      element.removeAttribute('data-bk-diff-active')
      reattachOriginalNodes()
    }
  }

  return {
    element,
    originalValue,
    rawOriginalValue,
    fieldType,
    setValue,
    setDiffHtml,
    restore,
    release,
  }
}
