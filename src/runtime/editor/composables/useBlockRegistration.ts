import {
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type VNode,
} from '#imports'
import type { DomProvider } from '../providers/dom'

/**
 * Find the first rendered node in a vnode subtree that matches.
 *
 * A block does not always render a single element as its root: it may render a
 * fragment (a multi-root template, which also happens when a comment precedes
 * the root element) or delegate rendering to a child component. In both cases
 * the component's `$el` is a text or comment anchor node instead of an element,
 * so we have to descend into the rendered tree to find the actual node.
 */
function findFirstNode(
  vnode: unknown,
  isMatch: (node: Node) => boolean,
): Node | null {
  if (Array.isArray(vnode)) {
    for (const child of vnode) {
      const node = findFirstNode(child, isMatch)
      if (node) {
        return node
      }
    }
    return null
  }

  if (!vnode || typeof vnode !== 'object') {
    return null
  }

  const { el, component, children } = vnode as VNode

  if (el instanceof Node && isMatch(el)) {
    return el
  }

  // A component vnode: continue with whatever the component rendered.
  if (component?.subTree) {
    const found = findFirstNode(component.subTree, isMatch)
    if (found) {
      return found
    }
  }

  return findFirstNode(children, isMatch)
}

function findFirstElement(vnode: unknown): HTMLElement | null {
  const node = findFirstNode(vnode, (v) => v instanceof HTMLElement)
  return node instanceof HTMLElement ? node : null
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

  let observer: MutationObserver | null = null
  let observedAnchor: Node | null = null

  function getDraggableElement(): HTMLElement | null {
    const draggableRef = instance?.refs.blokkliDraggable
    if (draggableRef instanceof HTMLElement) {
      return draggableRef
    } else if (draggableRef && typeof draggableRef === 'object') {
      // The ref points to another component. A template ref only ever lands on
      // the instance whose template declares it, so a child component that
      // wants to designate an element inside its own template has to expose it
      // as `blokkliDraggable` via defineExpose(). If it does, that wins.
      if (
        'blokkliDraggable' in draggableRef &&
        draggableRef.blokkliDraggable instanceof HTMLElement
      ) {
        return draggableRef.blokkliDraggable
      }

      // Else use the component's root element, descending into its rendered
      // tree if the component itself is a fragment.
      if ('$el' in draggableRef && draggableRef.$el instanceof HTMLElement) {
        return draggableRef.$el
      }

      const { $ } = draggableRef as { $?: { subTree?: VNode } }
      const el = findFirstElement($?.subTree)
      if (el) {
        return el
      }
    }

    return findFirstElement(instance?.subTree)
  }

  function stopObserving() {
    observer?.disconnect()
    observer = null
    observedAnchor = null
  }

  /**
   * Watch the DOM until the block renders an actual element.
   *
   * A block can be mounted before it has rendered anything: a child component
   * with an async `setup()` only renders a comment placeholder and swaps in its
   * markup once its setup resolves. When that happens outside of a pending
   * <Suspense> boundary the child mounts on its own, without updating the
   * block, so `onUpdated()` never fires and the block would stay unregistered
   * forever.
   *
   * Vue mounts the resolved markup into the same container as the placeholder
   * and then removes the placeholder, both in the same task. Observing the
   * container for child changes is therefore enough to catch it, and the
   * placeholder we anchored on doubles as the stop condition: as long as it is
   * still there, nothing relevant has happened.
   */
  function observePlaceholder() {
    const anchor = findFirstNode(instance?.subTree, () => true)
    const container = anchor?.parentNode

    if (!anchor || !container) {
      stopObserving()
      return
    }

    // Already watching this exact placeholder.
    if (observer && observedAnchor === anchor) {
      return
    }

    // The block re-rendered into a new placeholder, so the previous observer
    // (if any) is watching a node that is gone.
    stopObserving()

    observedAnchor = anchor
    observer = new MutationObserver(setRootElement)
    // The markup replacing the placeholder is inserted as a sibling of it, so
    // there is no need to observe the entire subtree.
    observer.observe(container, { childList: true })
  }

  function setRootElement() {
    const newElement = getDraggableElement()

    if (!newElement) {
      observePlaceholder()
      return
    }

    stopObserving()

    if (rootElement !== newElement) {
      rootElement = newElement
      dom.registerBlock(key, uuid, newElement)
    }
  }

  onMounted(setRootElement)
  onUpdated(setRootElement)
  onBeforeUnmount(() => {
    stopObserving()
    dom.unregisterBlock(key, uuid)
  })
}
