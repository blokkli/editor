import {
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type VNode,
} from '#imports'
import type { DomProvider } from '../providers/dom'

/**
 * Find the first rendered HTMLElement in a vnode subtree.
 *
 * A block does not always render a single element as its root: it may render a
 * fragment (a multi-root template, which also happens when a comment precedes
 * the root element) or delegate rendering to a child component. In both cases
 * the component's `$el` is a text or comment anchor node instead of an element,
 * so we have to descend into the rendered tree to find the actual element.
 */
function findFirstElement(vnode: unknown): HTMLElement | null {
  if (Array.isArray(vnode)) {
    for (const child of vnode) {
      const el = findFirstElement(child)
      if (el) {
        return el
      }
    }
    return null
  }

  if (!vnode || typeof vnode !== 'object') {
    return null
  }

  const { el, component, children } = vnode as VNode

  if (el instanceof HTMLElement) {
    return el
  }

  // A component vnode: continue with whatever the component rendered.
  if (component?.subTree) {
    const found = findFirstElement(component.subTree)
    if (found) {
      return found
    }
  }

  return findFirstElement(children)
}

/**
 * Helper composable to handle registering the block in the DOM provider.
 */
export function useBlockRegistration(dom: DomProvider, uuid: string) {
  const instance = getCurrentInstance()

  // Generate a unique key for this instance.
  const key =
    uuid +
    Math.round(Math.random() * 10000000000).toString() +
    Date.now().toString()

  let rootElement: HTMLElement | null = null

  function getDraggableElement(): HTMLElement | null {
    const blokkliDraggable = instance?.refs.blokkliDraggable
    if (blokkliDraggable instanceof HTMLElement) {
      return blokkliDraggable
    } else if (blokkliDraggable && typeof blokkliDraggable === 'object') {
      // The ref is another component. Try to get the root element, descending
      // into its rendered tree if the component itself is a fragment.
      if (
        '$el' in blokkliDraggable &&
        blokkliDraggable.$el instanceof HTMLElement
      ) {
        return blokkliDraggable.$el
      }

      const { $ } = blokkliDraggable as { $?: { subTree?: VNode } }
      const el = findFirstElement($?.subTree)
      if (el) {
        return el
      }
    }

    return findFirstElement(instance?.subTree)
  }

  function setRootElement() {
    const newElement = getDraggableElement()
    if (newElement && rootElement !== newElement) {
      rootElement = newElement
      dom.registerBlock(key, uuid, newElement)
    }
  }

  onMounted(setRootElement)
  onUpdated(setRootElement)
  onBeforeUnmount(() => {
    dom.unregisterBlock(key, uuid)
  })
}
