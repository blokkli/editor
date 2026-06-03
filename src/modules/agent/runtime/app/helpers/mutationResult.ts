import type { BlokkliApp } from '#blokkli/editor/types/app'

/**
 * Tree-shaped entry in the `newParagraphs` payload returned by mutation tools.
 *
 * Mirrors the input shape of `add_paragraphs` — nested children are grouped by
 * paragraph field name so the LLM can verify the structure round-tripped. A
 * flat list was previously emitted; the model could not tell whether a child
 * UUID was actually a sibling that got placed at the top level by mistake.
 */
export type NewParagraphNode = {
  uuid: string
  bundle: string
  paragraphFields?: string[]
  children?: Record<string, NewParagraphNode[]>
}

/**
 * Build the tree-shaped `newParagraphs` payload from a flat list of newly
 * created block UUIDs (computed as the set diff of `getAllUuids()` before vs
 * after a mutation).
 *
 * A block whose host is ALSO in `newUuids` is nested under that parent's
 * `children[fieldName]`. Top-level entries are blocks whose parent already
 * existed before the mutation — these were inserted into the target field.
 *
 * Per-block lookup uses `app.blocks.getBlock` (host metadata) and
 * `app.types.fieldConfig` (paragraph-field discovery), so no extra adapter
 * round-trips are needed.
 */
export function buildNewParagraphsTree(
  newUuids: string[],
  app: BlokkliApp,
  itemEntityType: string,
): NewParagraphNode[] {
  if (!newUuids.length) return []

  const newSet = new Set(newUuids)
  const nodes = new Map<string, NewParagraphNode>()
  const roots: NewParagraphNode[] = []
  // parentUuid → fieldName → child nodes (in insertion order)
  const pendingChildren = new Map<string, Map<string, NewParagraphNode[]>>()

  for (const uuid of newUuids) {
    const block = app.blocks.getBlock(uuid)
    if (!block) continue

    const paragraphFields = app.types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, block.bundle)
      .map((f) => f.name)

    const node: NewParagraphNode = {
      uuid,
      bundle: block.bundle,
      ...(paragraphFields.length ? { paragraphFields } : {}),
    }
    nodes.set(uuid, node)

    const host = block.host
    // Nest only when the host is one of the OTHER new blocks. A new block
    // dropped into an existing parent's field stays at the root — that's
    // what the LLM actually told the tool to do.
    if (host.type === itemEntityType && newSet.has(host.uuid)) {
      let perField = pendingChildren.get(host.uuid)
      if (!perField) {
        perField = new Map()
        pendingChildren.set(host.uuid, perField)
      }
      const bucket = perField.get(host.fieldName) ?? []
      bucket.push(node)
      perField.set(host.fieldName, bucket)
    } else {
      roots.push(node)
    }
  }

  for (const [parentUuid, perField] of pendingChildren) {
    const parent = nodes.get(parentUuid)
    if (!parent) continue
    parent.children = Object.fromEntries(perField)
  }

  return roots
}

/**
 * Count every node in a `newParagraphs` tree, including nested children.
 *
 * The tree-shaped envelope means a top-level array of length 1 can still
 * represent dozens of added blocks (one parent with many children). Callers
 * that report "added N paragraphs" should count recursively so the figure
 * stays honest.
 */
export function countNewParagraphs(nodes: NewParagraphNode[]): number {
  let total = 0
  for (const node of nodes) {
    total += 1
    if (node.children) {
      for (const childList of Object.values(node.children)) {
        total += countNewParagraphs(childList)
      }
    }
  }
  return total
}
