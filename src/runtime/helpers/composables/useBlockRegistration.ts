import {
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
} from '#imports'
import type { DomProvider } from '../providers/dom'

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
    } else if (
      // The ref is another component. Try to get the root element.
      blokkliDraggable !== null &&
      typeof blokkliDraggable === 'object' &&
      '$el' in blokkliDraggable
    ) {
      if (blokkliDraggable.$el instanceof HTMLElement) {
        return blokkliDraggable.$el
      }
    }

    const rootElement = instance?.proxy?.$el

    if (rootElement instanceof HTMLElement) {
      return rootElement
    }

    return null
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
