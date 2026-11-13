type BlockNode = {
  uuid: string
  children: BlockNode[]
}

/**
 * The order of the blocks, from their elements in document order.
 *
 * A block can have two elements. In a field in proxy mode, the block that the
 * field shows has a page in the band, which comes first, and its real element
 * below the band. The page stands in for the block: the blocks inside the real
 * element take the page's place, so that they follow the block, before the
 * next page. This repeats for a pager inside the shown block.
 */
export function orderBlockElements<T>(
  elements: T[],
  getUuid: (element: T) => string | undefined,
  contains: (element: T, other: T) => boolean,
): string[] {
  const roots: BlockNode[] = []
  const firstNodes = new Map<string, BlockNode>()

  // The elements that contain the current one, each with the node that gets
  // the blocks inside it: the block's first node, also for its second element.
  const ancestors: Array<{ element: T; node: BlockNode }> = []

  for (const element of elements) {
    const uuid = getUuid(element)
    if (!uuid) {
      continue
    }

    while (
      ancestors.length &&
      !contains(ancestors[ancestors.length - 1]!.element, element)
    ) {
      ancestors.pop()
    }

    const firstNode = firstNodes.get(uuid)
    const node = firstNode ?? { uuid, children: [] }
    if (!firstNode) {
      firstNodes.set(uuid, node)
      const parent = ancestors[ancestors.length - 1]
      ;(parent ? parent.node.children : roots).push(node)
    }
    ancestors.push({ element, node })
  }

  const order: string[] = []
  const visit = (nodes: BlockNode[]) => {
    for (const node of nodes) {
      order.push(node.uuid)
      visit(node.children)
    }
  }
  visit(roots)
  return order
}
