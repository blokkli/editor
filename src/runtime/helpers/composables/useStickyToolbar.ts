import type { ComputedRef, ShallowRef } from 'vue'
import onBlokkliEvent from './onBlokkliEvent'
import { computed, ref, useBlokkli } from '#imports'
import type { Coord, Rectangle } from '#blokkli/types'
import { falsy, findIdealRectPosition } from '..'

type PlacementVertical = 'top' | 'bottom'
type PlacementHorizontal = 'left' | 'center'

type UseStickyToolbarOptions = {
  getPlacementY?: () => PlacementVertical
  getPlacementX?: () => PlacementHorizontal
  shouldUpdate?: () => boolean
  getWidth?: () => number
  getHeight?: () => number
  getMargin?: () => number
  getAnchorElement?: () => HTMLElement | null
}

type UseStickyToolbar = {
  shouldRender: ComputedRef<boolean>
}

const limitPlacedRect = (rect: Rectangle, padding: Rectangle): Rectangle => {
  return {
    width: rect.width,
    height: rect.height,
    x: Math.min(
      Math.max(rect.x, padding.x),
      padding.x + padding.width - rect.width,
    ),
    y: Math.min(
      Math.max(padding.y, rect.y),
      padding.height + padding.y - rect.height,
    ),
  }
}

export default function (
  el: Readonly<ShallowRef<HTMLElement | null>>,
  options?: UseStickyToolbarOptions,
): UseStickyToolbar {
  const { ui, selection, dom } = useBlokkli()
  const shouldRender = ref(false)

  function getMargin(): number {
    if (options && options.getMargin) {
      return options.getMargin()
    }

    return 15
  }

  let anchorRect: Rectangle | null = null

  function getCoords(
    width: number,
    height: number,
    placementY: PlacementVertical,
    placementX: PlacementHorizontal,
    offset: Coord,
    scale: number,
  ): Coord | undefined {
    let minX = 0
    let maxX = 0
    let minY = 0
    let maxY = 0
    let hasRects = false

    // Use anchor element if provided
    if (options && options.getAnchorElement) {
      const anchorElement = options.getAnchorElement()
      if (anchorElement) {
        anchorRect ||= ui.getAbsoluteElementRect(
          anchorElement.getBoundingClientRect(),
          scale,
          offset,
        )
        const rectX = (anchorRect.x + offset.x / scale) * scale
        const rectY = (anchorRect.y + offset.y / scale) * scale
        const rectRight = rectX + anchorRect.width * scale
        const rectBottom = rectY + anchorRect.height * scale

        minX = rectX
        maxX = rectRight
        minY = rectY
        maxY = rectBottom
        hasRects = true
      }
    } else {
      // Use selection blocks
      const rects = selection.blocks.value
        .map((block) => dom.getBlockRect(block.uuid))
        .filter(falsy)
        .filter((rect) => rect.height || rect.width)

      hasRects = !!rects.length

      if (hasRects) {
        for (let i = 0; i < rects.length; i++) {
          const { x, y, height, width: rectWidth } = rects[i]!
          const rectX = (x + offset.x / scale) * scale
          const rectY = (y + offset.y / scale) * scale
          const rectRight = rectX + rectWidth * scale
          const rectBottom = rectY + height * scale

          if (i === 0 || rectX < minX) {
            minX = rectX
          }
          if (i === 0 || rectRight > maxX) {
            maxX = rectRight
          }
          if (i === 0 || rectY < minY) {
            minY = rectY
          }
          if (i === 0 || rectBottom > maxY) {
            maxY = rectBottom
          }
        }
      } else {
        if (!selection.hasHostSelected.value) {
          return
        }
        minX = offset.x
        maxX = minX + ui.artboardSize.value.width
        minY = offset.y
        maxY = minY + ui.artboardSize.value.height
      }
    }

    const padding = ui.visibleViewportPadded.value
    const xSubtract = hasRects ? 5 * Math.min(scale, 1) : 0
    const margin = getMargin() * Math.min(scale, 1)

    // Calculate Y position based on vertical placement
    const y = placementY === 'top' ? minY - height - margin : maxY + margin

    // Calculate X position based on horizontal placement
    let x: number
    if (placementX === 'center') {
      // Center the toolbar horizontally relative to the selection
      const centerX = (minX + maxX) / 2
      x = centerX - width / 2
    } else {
      // Default 'left' placement
      x = minX - xSubtract
    }

    const rect = limitPlacedRect(
      {
        x,
        y,
        width,
        height,
      },
      padding,
    )

    return findIdealRectPosition(ui.viewportBlockingRects.value, rect, padding)
  }

  function getWidth(): number | null {
    if (options && options.getWidth) {
      return options.getWidth()
    }

    if (el.value) {
      return el.value.clientWidth
    }

    return null
  }

  function getHeight(): number | null {
    if (options && options.getHeight) {
      return options.getHeight()
    }

    if (el.value) {
      return el.value.clientHeight
    }

    return null
  }

  function getPlacementVertical(): PlacementVertical {
    if (options && options.getPlacementY) {
      return options.getPlacementY()
    }

    return 'top'
  }

  function getPlacementHorizontal(): PlacementHorizontal {
    if (options && options.getPlacementX) {
      return options.getPlacementX()
    }

    return 'left'
  }

  onBlokkliEvent('canvas:draw', (ctx) => {
    if (!el.value) {
      return
    }

    if (ui.isMobile.value) {
      el.value.style.transform = ''
    }

    if (options && options.shouldUpdate && !options.shouldUpdate()) {
      return
    }

    const width = getWidth()
    const height = getHeight()

    if (width === null || height === null) {
      return
    }

    const placementY = getPlacementVertical()
    const placementX = getPlacementHorizontal()

    const coords = getCoords(
      width,
      height,
      placementY,
      placementX,
      ctx.artboardOffset,
      ctx.artboardScale,
    )

    if (!coords) {
      shouldRender.value = false
      return
    }

    el.value.style.transform = `translate3d(${coords.x}px, ${coords.y}px, 0)`
    shouldRender.value = true
  })

  return {
    shouldRender: computed(() => shouldRender.value),
  }
}
