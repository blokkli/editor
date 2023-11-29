import { falsy } from '#pb/helpers'
import { eventBus } from '../eventBus'

export type PbAnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void
}

export default function (): PbAnimationProvider {
  const mouseX = ref(0)
  const mouseY = ref(0)
  let raf: any = null
  const shouldDraw = ref(true)

  function onMouseMoveGlobal(e: MouseEvent) {
    mouseX.value = e.x
    mouseY.value = e.y
    shouldDraw.value = true
  }

  const loop = () => {
    // Make sure we don't loop when it's not needed.
    if (!shouldDraw.value) {
      raf = window.requestAnimationFrame(loop)
      return
    }
    shouldDraw.value = false

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
    eventBus.on('select', requestDraw)
    eventBus.on('select:start', requestDraw)
    eventBus.on('select:end', requestDraw)
    eventBus.on('selectAdditional', requestDraw)
    document.addEventListener('scroll', requestDraw)
    document.body.addEventListener('wheel', requestDraw, { passive: false })
    window.addEventListener('mousemove', onMouseMoveGlobal, {
      passive: false,
    })
  })

  onBeforeUnmount(() => {
    window.cancelAnimationFrame(raf)
    window.removeEventListener('mousemove', onMouseMoveGlobal)
    document.body.removeEventListener('wheel', requestDraw)
    document.removeEventListener('scroll', requestDraw)
    eventBus.off('select', requestDraw)
    eventBus.off('select:start', requestDraw)
    eventBus.off('select:end', requestDraw)
    eventBus.off('selectAdditional', requestDraw)
  })

  const requestDraw = () => (shouldDraw.value = true)

  return { requestDraw }
}
