import { defineAsyncComponent, getCurrentInstance } from '#imports'
import type { Component } from 'vue'

/**
 * Whether the node opens the server HTML of a component whose template has
 * several root nodes: Vue marks those with <!--[--> and <!--]-->.
 */
function startsSeveralRootNodes(
  node: { nodeType?: number; data?: string } | null | undefined,
): boolean {
  return node?.nodeType === Node.COMMENT_NODE && node.data === '['
}

/**
 * Returns the component wrapped so that Vue keeps its server-rendered HTML
 * and never hydrates it. When its props change, Vue renders it after all.
 *
 * getComponent() calls it once per rendered block, in the setup of the
 * component that renders the block as its root (BlokkliItem, or the
 * blokkli_fragment block for a blökkli fragment), on the server too:
 * - Vue can only update a block it didn't hydrate when the wrapper had not
 *   loaded yet while hydrating: a shared wrapper would throw on the update of
 *   every block after the first.
 * - The wrapper is an async boundary, which useId() counts: without it on the
 *   server, later ids differ from the server's.
 */
export function withoutHydration(component: Component): Component {
  // While hydrating, its element is the first DOM node of the block.
  const parent = getCurrentInstance()
  return defineAsyncComponent({
    loader: () => Promise.resolve(component),
    hydrate: (hydrate) => {
      // Vue can't move a block it didn't hydrate when the block has several
      // root nodes (when its list is reordered): those hydrate as usual.
      if (startsSeveralRootNodes(parent?.vnode.el)) {
        hydrate()
      }
    },
  })
}
