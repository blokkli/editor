import type { ComputedRef, ShallowRef } from 'vue'
import { onBlokkliEvent } from './onBlokkliEvent'
import { computed, ref, useBlokkli } from '#imports'
import { falsy } from '../../helpers'
import { findIdealRectPosition } from '#blokkli/editor/helpers/geometry'
import type { Coord, Rectangle } from '../types/geometry'

export type PlacementVertical = 'top' | 'bottom' | 'center' | 'auto'
export type PlacementHorizontal = 'left' | 'center' | 'right' | 'auto-side'

type UseStickyToolbarOptions = {
  getPlacementY?: () => PlacementVertical
  getPlacementX?: () => PlacementHorizontal
  shouldUpdate?: () => boolean
  getWidth?: () => number
  getHeight?: () => number
  getMargin?: () => number
  getAnchorElement?: () => HTMLElement | null
  getAnchorCoordinates?: () => Coord | null
  getCaretWidth?: () => number
  allowHorizontalOverflow?: boolean
}

type UseStickyToolbar = {
  shouldRender: ComputedRef<boolean>
  placementY: ComputedRef<'top' | 'bottom' | 'center'>
  placementX: ComputedRef<'left' | 'center' | 'right'>
  caretX: ComputedRef<number>
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

export function useStickyToolbar(
  el: Readonly<ShallowRef<HTMLElement | null>>,
  options?: UseStickyToolbarOptions,
): UseStickyToolbar {
  const { ui, selection, dom } = useBlokkli()
  const shouldRender = ref(false)
  const actualPlacementY = ref<'top' | 'bottom' | 'center'>('bottom')
  const actualPlacementX = ref<'left' | 'center' | 'right'>('center')
  const caretXPosition = ref<number>(0)

  function getMargin(): number {
    if (options && options.getMargin) {
      return options.getMargin()
    }

    return 15
  }

  function getCaretWidth(): number {
    if (options && options.getCaretWidth) {
      return options.getCaretWidth()
    }

    return 0
  }

  let anchorRect: Rectangle | null = null

  function getCoords(
    width: number,
    height: number,
    placementY: PlacementVertical,
    placementX: PlacementHorizontal,
    offset: Coord,
    scale: number,
  ):
    | (Coord & {
        actualPlacementY: 'top' | 'bottom' | 'center'
        actualPlacementX: 'left' | 'center' | 'right'
        caretX: number
      })
    | undefined {
    let minX = 0
    let maxX = 0
    let minY = 0
    let maxY = 0
    let hasRects = false

    const anchorElement =
      options && options.getAnchorElement ? options.getAnchorElement() : null
    const anchorCoordinates =
      options && options.getAnchorCoordinates
        ? options.getAnchorCoordinates()
        : null

    // Use anchor coordinates if provided (highest priority)
    if (anchorCoordinates) {
      // Coordinates are in artboard space, convert to screen space
      const rectX = (anchorCoordinates.x + offset.x / scale) * scale
      const rectY = (anchorCoordinates.y + offset.y / scale) * scale

      // Create a small point rect (1x1)
      minX = rectX
      maxX = rectX + 1
      minY = rectY
      maxY = rectY + 1
      hasRects = true
    } else if (anchorElement) {
      // Use anchor element if provided
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
    } else {
      // Use selected blocks.
      const rects = selection.uuids.value
        .map((uuid) => dom.getBlockRect(uuid))
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
    const margin = getMargin() * Math.min(scale, 1)

    // Calculate the center of the anchor element or selection
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Determine actual placement if 'auto' is specified
    let actualPlacementY: 'top' | 'bottom' | 'center' =
      placementY === 'center'
        ? 'center'
        : placementY === 'auto'
          ? 'bottom'
          : placementY
    if (placementY === 'auto') {
      const spaceAbove = minY - padding.y
      const spaceBelow = padding.y + padding.height - maxY
      const requiredSpace = height + margin

      if (spaceBelow >= requiredSpace) {
        // Prefer bottom if there's enough space
        actualPlacementY = 'bottom'
      } else if (spaceAbove >= requiredSpace) {
        actualPlacementY = 'top'
      } else {
        // Neither has enough space, use the side with more available space
        actualPlacementY = spaceAbove > spaceBelow ? 'top' : 'bottom'
      }
    }

    // Resolve auto-side: pick left or right based on available space.
    const isSidePlacement = placementX === 'auto-side'
    let resolvedPlacementX: 'left' | 'center' | 'right' = isSidePlacement
      ? 'right'
      : placementX
    if (isSidePlacement) {
      const spaceRight = padding.x + padding.width - maxX
      const spaceLeft = minX - padding.x
      if (spaceRight >= width + margin) {
        resolvedPlacementX = 'right'
      } else if (spaceLeft >= width + margin) {
        resolvedPlacementX = 'left'
      } else {
        resolvedPlacementX = spaceRight >= spaceLeft ? 'right' : 'left'
      }
    }

    // Calculate Y position based on vertical placement
    let y: number
    if (isSidePlacement) {
      // For side placement, align the tooltip's top edge with the anchor's top edge.
      y = minY
    } else if (placementY === 'center') {
      // Center vertically relative to the selection
      y = centerY - height / 2
    } else {
      y = actualPlacementY === 'top' ? minY - height - margin : maxY + margin
    }

    // Calculate X position based on horizontal placement
    let x: number
    if (isSidePlacement && resolvedPlacementX === 'right') {
      // Side placement: place entirely to the right of the selection
      x = maxX + margin
    } else if (isSidePlacement && resolvedPlacementX === 'left') {
      // Side placement: place entirely to the left of the selection
      x = minX - width - margin
    } else if (resolvedPlacementX === 'center') {
      // Center the toolbar horizontally relative to the selection
      x = centerX - width / 2
    } else if (resolvedPlacementX === 'right') {
      // Align at the right edge of the selection
      x = maxX - width
    } else {
      // Default 'left': align at the left edge of the selection
      x = minX
    }

    // Check if we should allow horizontal overflow
    const shouldAllowOverflow =
      options?.allowHorizontalOverflow && width > padding.width

    let idealPosition: Coord

    if (shouldAllowOverflow) {
      // When allowing overflow, only limit the Y position to keep it visible vertically
      // but let X extend beyond viewport bounds
      const limitedY = Math.min(
        Math.max(padding.y, y),
        padding.height + padding.y - height,
      )
      idealPosition = { x, y: limitedY }
    } else {
      // Standard behavior: limit both X and Y to viewport
      const rect = limitPlacedRect(
        {
          x,
          y,
          width,
          height,
        },
        padding,
      )

      const position = findIdealRectPosition(
        ui.viewportBlockingRects.value,
        rect,
        padding,
      )

      if (!position) {
        return undefined
      }

      idealPosition = position
    }

    // Calculate caret X position relative to the sticky element
    // The caret should point at the center of the anchor/selection
    // Clamp it to stay within the element's width, accounting for caret width
    const caretWidth = getCaretWidth()
    const caretHalfWidth = caretWidth / 2
    const minCaretX = caretHalfWidth
    const maxCaretX = width - caretHalfWidth
    const caretX = Math.max(
      minCaretX,
      Math.min(centerX - idealPosition.x, maxCaretX),
    )

    return {
      ...idealPosition,
      actualPlacementY,
      actualPlacementX: resolvedPlacementX,
      caretX,
    }
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
      shouldRender.value = true
      return
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
    actualPlacementY.value = coords.actualPlacementY
    actualPlacementX.value = coords.actualPlacementX
    caretXPosition.value = coords.caretX
    shouldRender.value = true
  })

  return {
    shouldRender: computed(() => shouldRender.value),
    placementY: computed(() => actualPlacementY.value),
    placementX: computed(() => actualPlacementX.value),
    caretX: computed(() => caretXPosition.value),
  }
}
