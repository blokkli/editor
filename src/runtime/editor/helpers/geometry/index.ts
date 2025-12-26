import type { Rectangle, Coord, Size } from '#blokkli/types'
import { easeOutSine } from '../easing'

export function getBounds(rects: Rectangle[]): Rectangle | undefined {
  if (!rects.length) {
    return
  }

  const firstRect = rects[0]!
  let minX = firstRect.x
  let minY = firstRect.y
  let maxX = minX + firstRect.width
  let maxY = minY + firstRect.height

  for (const rect of rects.slice(1)) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function isInsideRect(x: number, y: number, rect: Rectangle): boolean {
  return (
    x > rect.x &&
    x < rect.x + rect.width &&
    y > rect.y &&
    y < rect.y + rect.height
  )
}

/**
 * Calculate the intersection amount of two rectangles as a value from 0 to 1.
 */
export function calculateIntersection(
  rectA: Rectangle,
  rectB: Rectangle,
): number {
  if (!intersects(rectA, rectB)) {
    return 0
  }
  const xOverlap = Math.max(
    0,
    Math.min(rectA.x + rectA.width, rectB.x + rectB.width) -
      Math.max(rectA.x, rectB.x),
  )
  const yOverlap = Math.max(
    0,
    Math.min(rectA.y + rectA.height, rectB.y + rectB.height) -
      Math.max(rectA.y, rectB.y),
  )

  const intersectionArea = xOverlap * yOverlap
  const rectAArea = rectA.width * rectA.height

  return intersectionArea / rectAArea
}

/**
 * Return the closest rectangle.
 */
export function findClosestRectangle<T extends Rectangle>(
  x: number,
  y: number,
  rects: T[],
): T {
  let closestRect: T | undefined = rects[0]
  if (!closestRect) {
    throw new Error('Need at least one rect.')
  }

  let minDistance = distanceToClosestRectangleEdge(x, y, closestRect)

  for (let i = 1; i < rects.length; i++) {
    const rect = rects[i]!
    const distance = distanceToClosestRectangleEdge(x, y, rect)

    if (distance < minDistance) {
      closestRect = rect
      minDistance = distance
    }
  }

  return closestRect
}

/**
 * Return the distance from the given coordinates to the center of the rectangle.
 */
export function distanceToRectangle(
  x: number,
  y: number,
  rect: Rectangle,
): number {
  const minX = rect.x
  const minY = rect.y
  const maxX = rect.x + rect.width
  const maxY = rect.y + rect.height
  const dx = Math.max(minX - x, 0, x - maxX)
  const dy = Math.max(minY - y, 0, y - maxY)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Return the distance from the given coordinates to the center of the rectangle.
 */
export function distanceToClosestRectangleEdge(
  x: number,
  y: number,
  rect: Rectangle,
): number {
  if (isInsideRect(x, y, rect)) {
    return 0
  }
  const minX = rect.x
  const minY = rect.y
  const maxX = rect.x + rect.width
  const maxY = rect.y + rect.height

  const dx = Math.max(minX - x, 0, x - maxX)
  const dy = Math.max(minY - y, 0, y - maxY)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Subtracts a rectangle from a viewport and returns the remaining area as rectangles.
 * The viewport is assumed to have x=0 and y=0.
 *
 * @param viewport - The size of the viewport to subtract from
 * @param rect - The rectangle to subtract
 * @returns An array of 0 to 4 rectangles representing the area outside of rect
 */
export function subtractRectFromViewport(
  viewport: Size,
  rect: Rectangle,
): Rectangle[] {
  const viewportLeft = 0
  const viewportTop = 0
  const viewportRight = viewport.width
  const viewportBottom = viewport.height

  const intersectLeft = Math.max(viewportLeft, rect.x)
  const intersectTop = Math.max(viewportTop, rect.y)
  const intersectRight = Math.min(viewportRight, rect.x + rect.width)
  const intersectBottom = Math.min(viewportBottom, rect.y + rect.height)

  // If there's no intersection, return the viewport as a rectangle.
  if (intersectLeft >= intersectRight || intersectTop >= intersectBottom) {
    return [
      {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      },
    ]
  }

  // Intersection covers the entire viewport.
  if (
    intersectLeft <= viewportLeft &&
    intersectTop <= viewportTop &&
    intersectRight >= viewportRight &&
    intersectBottom >= viewportBottom
  ) {
    return []
  }

  const result: Rectangle[] = []

  // Top rectangle (area above the intersection)
  if (intersectTop > viewportTop) {
    result.push({
      x: viewportLeft,
      y: viewportTop,
      width: viewport.width,
      height: intersectTop - viewportTop,
    })
  }

  // Bottom rectangle (area below the intersection)
  if (intersectBottom < viewportBottom) {
    result.push({
      x: viewportLeft,
      y: intersectBottom,
      width: viewport.width,
      height: viewportBottom - intersectBottom,
    })
  }

  // Left rectangle (area to the left of intersection, between top and bottom)
  if (intersectLeft > viewportLeft) {
    result.push({
      x: viewportLeft,
      y: intersectTop,
      width: intersectLeft - viewportLeft,
      height: intersectBottom - intersectTop,
    })
  }

  // Right rectangle (area to the right of intersection, between top and bottom)
  if (intersectRight < viewportRight) {
    result.push({
      x: intersectRight,
      y: intersectTop,
      width: viewportRight - intersectRight,
      height: intersectBottom - intersectTop,
    })
  }

  return result
}

export function getDistance(a: Coord, b: Coord) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Position the given rectToPlace so that it doesn't overlap with any of the blockingRects.
 */
export function findIdealRectPosition(
  blockingRects: Rectangle[],
  rectToPlace: Rectangle,
  viewport: Rectangle,
  maxOverlap = 60,
): { x: number; y: number } {
  let targetX = rectToPlace.x

  for (const blockingRect of blockingRects) {
    if (intersects(rectToPlace, blockingRect)) {
      const a = Math.abs(rectToPlace.y + rectToPlace.height - blockingRect.y)
      const b = Math.abs(blockingRect.y + blockingRect.height - rectToPlace.y)
      const verticalOverlap = Math.min(a, b)

      const smoothingFactor = easeOutSine(
        Math.min(verticalOverlap, maxOverlap) / maxOverlap,
      )

      if (
        rectToPlace.x + rectToPlace.width / 2 >
        blockingRect.x + blockingRect.width / 2
      ) {
        targetX = blockingRect.x + blockingRect.width
      } else {
        targetX = blockingRect.x - rectToPlace.width
      }
      // Adjust targetX based on the smoothing factor
      targetX = rectToPlace.x + smoothingFactor * (targetX - rectToPlace.x)
      break
    }
  }

  return {
    x: Math.min(
      Math.max(targetX, viewport.x),
      viewport.x + viewport.width - rectToPlace.width,
    ),
    y: Math.min(
      Math.max(viewport.y, rectToPlace.y),
      viewport.height + viewport.y - rectToPlace.height,
    ),
  }
}

/**
 * Calculate the ideal X coordinate for placing a rectangle.
 *
 * Coordinates are assumed to be 0,0 for top-left. The method returns a number that can be used to set the
 */
export const calculateCenterPosition = (
  // Rectangles that block the viewport.
  blockingRects: Rectangle[],
  // The viewport in which the center should be determined.
  // Note that this may not correspond to the actual browser viewport.
  viewport: Rectangle,
  // The width to use when determining the center.
  widthToPlace: number,
): number => {
  // The center of the viewport.
  const viewportCenterX = (viewport.x + viewport.width) / 2

  // The amount of pixels a blocking rect must be away from the center so it
  // affects positioning.
  const blockingThreshold = viewport.width / 7

  const x = blockingRects.reduce((acc, rect) => {
    // If the rectangle is left of the center.
    if (
      rect.x < viewportCenterX &&
      viewportCenterX - rect.x > blockingThreshold &&
      rect.x + rect.width > acc
    ) {
      return rect.x + rect.width
    }
    return acc
  }, viewport.x)

  const width = blockingRects.reduce((acc, rect) => {
    // If the rectangle is right of the center.
    if (
      rect.x > viewportCenterX &&
      rect.x - viewportCenterX > blockingThreshold &&
      rect.x < acc
    ) {
      return rect.x
    }
    return acc
  }, viewport.width + viewport.x)

  // Calculate the center X.
  return (x + width) / 2 - widthToPlace / 2
}
