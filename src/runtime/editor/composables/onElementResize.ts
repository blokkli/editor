import type { Ref } from 'vue'
import { watch, onUnmounted } from '#imports'
import type { Size } from '../types/geometry'

export function onElementResize(
  el: Ref<HTMLElement | null>,
  cb: (size: Size) => void,
) {
  let observer: ResizeObserver | null = null

  function disconnect() {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  watch(
    el,
    (element) => {
      disconnect()

      if (!element) {
        return
      }

      observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }
        const boxSize = entry.borderBoxSize[0]
        if (!boxSize) {
          return
        }
        cb({
          width: boxSize.inlineSize,
          height: boxSize.blockSize,
        })
      })

      observer.observe(element)
    },
    { immediate: true },
  )

  onUnmounted(disconnect)
}
