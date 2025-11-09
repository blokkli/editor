import type { BlokkliFieldElement } from '#blokkli/types'

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

export function determineCanAddChildren(
  field: BlokkliFieldElement,
  children: HTMLElement[],
  uuids: string[],
  currentCount: number,
  itemsToAdd: number,
  draggingBundles?: string[],
  draggingFragments?: string[],
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

  if (!draggingBundles?.length) {
    return true
  }

  // Check if all dragging bundles are allowed.
  const bundlesAllowed = draggingBundles.every((bundle) =>
    field.allowedBundles.includes(bundle),
  )

  if (!bundlesAllowed) {
    return false
  }

  // If there are fragment restrictions and we're dragging fragments, check them.
  if (
    draggingFragments?.length &&
    field.allowedFragments.length > 0
  ) {
    return draggingFragments.every((fragment) =>
      field.allowedFragments.includes(fragment),
    )
  }

  return true
}
