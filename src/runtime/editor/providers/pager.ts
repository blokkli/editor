import { computed, reactive, watch } from '#imports'
import type { SelectionProvider } from './selection'
import type { StateProvider } from './state'

/**
 * A block in a field, on the way from a block up to the page.
 */
type PathStep = {
  /** The key of the field: the uuid of the entity holding it, and its name. */
  fieldKey: string

  /** The block in the field. */
  uuid: string

  /** The index of the block in the field. */
  index: number
}

export type PagerProvider = {
  /**
   * The block that a field in proxy mode shows: the one it showed last, as
   * long as it's in the field. Else the block now at its index, which took its
   * place, or the last one. Else the first one.
   */
  getShown: (fieldKey: string, childUuids: string[]) => string | null

  /**
   * Show the block in its field, and in each field above it the block that
   * contains it.
   *
   * Showing is remembered for every field on the way, whether it's in proxy
   * mode or not: a field inside a block that isn't shown isn't rendered, so
   * nothing can tell. A field that isn't in proxy mode ignores it.
   */
  show: (uuid: string) => void

  /**
   * Whether the block is selected or holds a selected block.
   */
  holdsSelection: (uuid: string) => boolean
}

export default function (
  state: StateProvider,
  selection: SelectionProvider,
): PagerProvider {
  const shown = reactive(new Map<string, { uuid: string; index: number }>())

  function getPath(uuid: string): PathStep[] {
    const path: PathStep[] = []
    let current: string | undefined = uuid
    while (current) {
      const field = state.getFieldListForBlock(current)
      if (!field) {
        break
      }
      const blockUuid: string = current
      path.push({
        fieldKey: field.entityUuid + ':' + field.name,
        uuid: blockUuid,
        index: field.list.findIndex((item) => item.uuid === blockUuid),
      })
      current = field.entityUuid
    }
    return path
  }

  function showPath(path: PathStep[]) {
    for (const step of path) {
      const current = shown.get(step.fieldKey)
      if (current?.uuid !== step.uuid || current.index !== step.index) {
        shown.set(step.fieldKey, { uuid: step.uuid, index: step.index })
      }
    }
  }

  function show(uuid: string) {
    showPath(getPath(uuid))
  }

  function getShown(fieldKey: string, childUuids: string[]): string | null {
    const entry = shown.get(fieldKey)
    if (entry && childUuids.includes(entry.uuid)) {
      return entry.uuid
    }
    if (entry) {
      return childUuids[Math.min(entry.index, childUuids.length - 1)] ?? null
    }
    return childUuids[0] ?? null
  }

  // The way up from the selected block, when exactly one is selected. It
  // changes too when the block moves, e.g. into another field.
  const selectedPath = computed<PathStep[]>(() => {
    const uuids = selection.uuids.value
    return uuids.length === 1 && uuids[0] ? getPath(uuids[0]) : []
  })

  // Follow the selection: a click on a page selects its block through the
  // canvas, and navigating selects blocks anywhere. Runs before the render, so
  // the block is shown in the same render. Not while dragging: pressing a page
  // selects its block, and the block below the band would change mid-drag.
  // Once the drag ends, the selected block is shown.
  watch(
    () => (selection.isDragging.value ? null : selectedPath.value),
    (path) => {
      if (path) {
        showPath(path)
      }
    },
  )

  const holdingSelection = computed<Set<string>>(
    () =>
      new Set(
        selection.uuids.value.flatMap((uuid) =>
          getPath(uuid).map((step) => step.uuid),
        ),
      ),
  )

  function holdsSelection(uuid: string): boolean {
    return holdingSelection.value.has(uuid)
  }

  return {
    getShown,
    show,
    holdsSelection,
  }
}
