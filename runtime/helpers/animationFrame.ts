import { falsy } from '#pb/helpers'
import { eventBus } from '../eventBus'

export default function () {
  const mouseX = ref(0)
  const mouseY = ref(0)
  let raf: any = null

  function onMouseMoveGlobal(e: MouseEvent) {
    mouseX.value = e.x
    mouseY.value = e.y
  }

  const loop = () => {
    // Let the "Artboard" feature alter the position/scale of the root element
    // before triggering the main animation loop event.
    eventBus.emit('animationFrame:before')

    const wrapperEl = document.querySelector('.pb-main-canvas')
    const nuxtRootEl = document.querySelector('#nuxt-root')
    const sidebarEl = document.querySelector('.pb-sidebar')
    if (wrapperEl instanceof HTMLElement) {
      const canvasRect = wrapperEl?.getBoundingClientRect()
      const rootRect = nuxtRootEl?.getBoundingClientRect()
      const sidebarRect = sidebarEl?.getBoundingClientRect()
      const fieldAreas = [...document.querySelectorAll('[data-field-label]')]
        .map((el) => {
          if (el instanceof HTMLElement) {
            const rect = el.getBoundingClientRect()
            const label = el.dataset.fieldLabel
            const name = el.dataset.fieldName
            const key = el.dataset.fieldKey
            const isNested = el.dataset.fieldIsNested === 'true'
            if (label && name && key) {
              return {
                key,
                label,
                name,
                isNested,
                rect,
                isVisible: !!el.offsetHeight,
              }
            }
          }
        })
        .filter(falsy)
      if (canvasRect && rootRect && sidebarRect) {
        rootRect.width = rootRect.width - sidebarRect.width
        const scale = parseInt(wrapperEl.style.scale)
        eventBus.emit('animationFrame', {
          mouseX: mouseX.value,
          mouseY: mouseY.value,
          scale: isNaN(scale) ? 1 : scale,
          rootRect,
          canvasRect,
          fieldAreas,
          rects: [
            ...document.querySelectorAll(
              '[data-element-type="existing"]:not(.sortable-drag)',
            ),
          ].reduce<Record<string, DOMRect>>((acc, el) => {
            if (el instanceof HTMLElement) {
              const uuid = el.dataset.uuid
              if (uuid) {
                const rect = el.getBoundingClientRect()
                acc[uuid] = rect
              }
            }
            return acc
          }, {}),
        })
      }
    }
    raf = window.requestAnimationFrame(loop)
  }

  onMounted(() => {
    loop()
    window.addEventListener('mousemove', onMouseMoveGlobal, {
      passive: false,
    })
  })

  onBeforeUnmount(() => {
    window.cancelAnimationFrame(raf)
    window.removeEventListener('mousemove', onMouseMoveGlobal)
  })
}
