import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import type { DraggableItem } from '#blokkli/editor/types/draggable'
import type { StateProvider } from '#blokkli/editor/providers/state'

export type Orientation = 'horizontal' | 'vertical'

export const MIN_GAP = 20

export function getGapSize(
  orientation: Orientation,
  element: HTMLElement,
): number {
  const computedStyle = window.getComputedStyle(element)

  // Check for Grid or Flex layout
  if (
    computedStyle.display.includes('grid') ||
    computedStyle.display.includes('flex')
  ) {
    const gap =
      orientation === 'vertical'
        ? computedStyle.rowGap || computedStyle.gridRowGap
        : computedStyle.columnGap || computedStyle.gridColumnGap

    if (gap) {
      // Extract the first value.
      const gapParts = gap.split(' ')
      const gapValue = gapParts[0]
      if (gapValue?.endsWith('px')) {
        return Number.parseFloat(gapValue)
      }
    }
  }

  return MIN_GAP
}

export function getChildrenOrientation(element: HTMLElement): Orientation {
  const computedStyle = window.getComputedStyle(element)

  // Check for Flex layout
  if (computedStyle.display.includes('flex')) {
    // Flex direction row or row-reverse indicates horizontal layout
    if (
      computedStyle.flexDirection === 'row' ||
      computedStyle.flexDirection === 'row-reverse'
    ) {
      return 'horizontal'
    } else {
      // Otherwise, it's vertical
      return 'vertical'
    }
  }

  // Check for Grid layout
  if (computedStyle.display.includes('grid')) {
    // We'll need to check the grid-template-columns and grid-template-rows
    // This is a simple check, assuming a basic grid layout
    if (computedStyle.gridTemplateColumns.split(' ').length > 1) {
      return 'horizontal'
    } else {
      return 'vertical'
    }
  }

  // Default to vertical for block elements and other displays
  return 'vertical'
}

/**
 * The number of blocks the dragged items add: an item can add several, such as
 * dropped files.
 */
export function getDraggingBlockCount(items: DraggableItem[]): number {
  return items.reduce(
    (count, item) => count + (('blockCount' in item && item.blockCount) || 1),
    0,
  )
}

/**
 * The bundle groups of dragged items that add a block per group, such as
 * dropped files of several types.
 */
export function getDraggingBundleGroups(items: DraggableItem[]): string[][] {
  return items.flatMap((item) =>
    'itemBundleGroups' in item && item.itemBundleGroups
      ? item.itemBundleGroups
      : [],
  )
}

/**
 * How many levels the dragged blocks take: one, and one more for every level
 * of blocks nested in them. New items take one level.
 *
 * @param uuids - The UUIDs of the dragged blocks.
 */
export function getDraggingDepth(
  uuids: string[],
  state: Pick<StateProvider, 'getAllUuids' | 'getNestingLevel' | 'isChildOf'>,
): number {
  let depth = 1
  if (!uuids.length) {
    return depth
  }
  const all = state.getAllUuids()
  for (const uuid of uuids) {
    const level = state.getNestingLevel(uuid)
    for (const other of all) {
      if (state.isChildOf(other, uuid)) {
        depth = Math.max(depth, state.getNestingLevel(other) - level + 1)
      }
    }
  }
  return depth
}

/**
 * Whether blocks fit into a field without being nested deeper than the
 * adapter allows.
 *
 * @param fieldLevel - The nesting level of the field: 0 for a field of the host entity.
 * @param depth - How many levels the blocks take.
 * @param maxLevel - The deepest level from the adapter, where the blocks in a field of the host entity are on level 1. Undefined for no limit.
 */
export function fitsNestingLimit(
  fieldLevel: number,
  depth: number,
  maxLevel: number | undefined,
): boolean {
  return maxLevel === undefined || fieldLevel + depth <= maxLevel
}

export function determineCanAddChildren(
  field: BlokkliFieldElement,
  children: HTMLElement[],
  uuids: string[],
  currentCount: number,
  itemsToAdd: number,
  draggingBundles?: string[],
  draggingFragments?: string[],
  isBundlePermitted?: (bundle: string) => boolean,
  draggingBundleGroups?: string[][],
): boolean {
  // Check cardinality of field.
  if (field.cardinality !== -1) {
    // Count of children that are also part of the selection.
    const childrenThatAreSelection = children.filter((child) => {
      const uuid = child.dataset.bkUuid
      if (!uuid) {
        return false
      }
      return uuids.includes(uuid)
    }).length
    const countAfter = currentCount - childrenThatAreSelection + itemsToAdd
    if (countAfter > field.cardinality) {
      return false
    }
  }

  const canAddBundle = (bundle: string) =>
    field.allowedBundles.includes(bundle) &&
    (!isBundlePermitted || isBundlePermitted(bundle))

  // New items that add a block per group of bundles, such as dropped files of
  // several types: every group needs a bundle that can be added.
  if (!uuids.length && draggingBundleGroups?.length) {
    return draggingBundleGroups.every((group) => group.some(canAddBundle))
  }

  if (!draggingBundles?.length) {
    return true
  }

  // No existing blocks are dragged. We only need to check if _any_ of the
  // dragging bundles are allowed. For example, when dragging a media library
  // or search item that can produce several bundles, it can be added whenever
  // any bundle is allowed. The dragging overlay will display a selector to pick
  // which bundle should be created in this case.
  if (!uuids.length) {
    return draggingBundles.some(canAddBundle)
  }

  // Handle dragging existing blocks. In this case, all the dragging bundles
  // must be allowed in the field, because we perform a "move" operation.
  const bundlesAllowed = draggingBundles.every((bundle) =>
    field.allowedBundles.includes(bundle),
  )

  if (!bundlesAllowed) {
    return false
  }

  // If there are fragment restrictions and we're dragging fragments, check them.
  if (draggingFragments?.length && field.allowedFragments.length > 0) {
    return draggingFragments.every((fragment) =>
      field.allowedFragments.includes(fragment),
    )
  }

  return true
}
