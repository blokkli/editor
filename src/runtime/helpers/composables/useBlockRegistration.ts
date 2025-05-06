import {
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  onUpdated,
} from '#imports'
import type { DomProvider } from '../domProvider'

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

  function setRootElement() {
    const newElement = instance?.proxy?.$el
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
