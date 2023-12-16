import { onMounted, onBeforeUnmount } from '#imports'

import { falsy, isInsideRect } from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'

export type BlokkliAnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void
}

export default function (): BlokkliAnimationProvider {
  let mouseX = 0
  let mouseY = 0

  let raf: any = null

  // Keep track of how many frames should be rendered.
  // Assuming 60 fps, this value means after every draw request we will only
  // render a maximum of 2 seconds.
  let iterator = 120

  function onMouseMoveGlobal(e: MouseEvent) {
    mouseX = e.x
    mouseY = e.y
    iterator = 120
  }

  const loop = () => {
    // Make sure we don't loop when it's not needed.
    if (iterator < 1) {
      raf = window.requestAnimationFrame(loop)
      return
    }

    // Decrement the value.
    iterator--

    // Let the "Artboard" feature alter the position/scale of the root element
    // before triggering the main animation loop event.
    eventBus.emit('animationFrame:before')

    const wrapperEl = document.querySelector('.bk-main-canvas')
    const nuxtRootEl = document.querySelector('#nuxt-root')
    const sidebarEl = document.querySelector('.bk-sidebar')
    if (wrapperEl instanceof HTMLElement) {
      const canvasRect = wrapperEl?.getBoundingClientRect()
      const rootRect = nuxtRootEl?.getBoundingClientRect()
      const sidebarRect = sidebarEl?.getBoundingClientRect()
      const fieldAreas = [
        ...document.querySelectorAll(
          '[data-blokkli-provider-active="true"] [data-field-label]',
        ),
      ]
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
        const scale = parseFloat(wrapperEl.style.scale)
        const rects: Record<string, DOMRect> = {}
        let hoveredUuid = ''
        const elements = [
          ...document.querySelectorAll(
            '[data-blokkli-provider-active="true"] [data-element-type="existing"]',
          ),
        ]

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i]
          if (el instanceof HTMLElement) {
            const uuid = el.dataset.uuid
            if (uuid) {
              const rect = el.getBoundingClientRect()
              rects[uuid] = rect
              if (isInsideRect(mouseX, mouseY, rect)) {
                hoveredUuid = uuid
              }
            }
          }
        }
        eventBus.emit('animationFrame', {
          mouseX,
          mouseY,
          scale: isNaN(scale) ? 1 : scale,
          rootRect,
          canvasRect,
          fieldAreas,
          rects,
          hoveredUuid,
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
    eventBus.on('select:toggle', requestDraw)
    eventBus.on('option:update', requestDraw)
    eventBus.on('state:reloaded', requestDraw)
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
    eventBus.off('select:toggle', requestDraw)
    eventBus.off('option:update', requestDraw)
    eventBus.off('state:reloaded', requestDraw)
  })

  const requestDraw = () => (iterator = 120)

  return { requestDraw }
}
