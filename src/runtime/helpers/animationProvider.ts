import { onMounted, onBeforeUnmount } from '#imports'
import { falsy, isInsideRect } from '#blokkli/helpers'
import { eventBus } from '#blokkli/helpers/eventBus'
import onBlokkliEvent from './composables/onBlokkliEvent'
import useAnimationFrame from './composables/useAnimationFrame'

export type AnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void
}

export default function (): AnimationProvider {
  let mouseX = 0
  let mouseY = 0

  // Keep track of how many frames should be rendered.
  // Assuming 60 fps, this value means after every draw request we will only
  // render a maximum of 2 seconds.
  let iterator = 120

  const onMouseMoveGlobal = (e: MouseEvent) => {
    mouseX = e.x
    mouseY = e.y
    iterator = 120
  }

  const onTouchMoveGlobal = (e: TouchEvent) => {
    const touch = e.touches[0]
    mouseX = touch.pageX
    mouseY = touch.pageY
    iterator = 120
  }

  useAnimationFrame(() => {
    // Make sure we don't loop when it's not needed.
    if (iterator < 1) {
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
  })

  onMounted(() => {
    document.addEventListener('scroll', requestDraw)
    document.body.addEventListener('wheel', requestDraw, { passive: false })
    window.addEventListener('mousemove', onMouseMoveGlobal, {
      passive: false,
    })
    window.addEventListener('touchmove', onTouchMoveGlobal, {
      passive: false,
    })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMouseMoveGlobal)
    window.removeEventListener('touchmove', onTouchMoveGlobal)
    document.body.removeEventListener('wheel', requestDraw)
    document.removeEventListener('scroll', requestDraw)
  })

  const requestDraw = () => (iterator = 120)

  onBlokkliEvent('select', requestDraw)
  onBlokkliEvent('select:start', requestDraw)
  onBlokkliEvent('select:end', requestDraw)
  onBlokkliEvent('select:toggle', requestDraw)
  onBlokkliEvent('option:update', requestDraw)
  onBlokkliEvent('state:reloaded', requestDraw)

  return { requestDraw }
}
