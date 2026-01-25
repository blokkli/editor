import { createBufferInfoFromArrays, type BufferInfo } from 'twgl.js'
import { intersects } from './../geometry'
import type { Rectangle } from '#blokkli/editor/types/geometry'

type RectangleBufferRect = Rectangle & {
  id: string
  index: number
  radius?: [number, number, number, number]
  state?: number
  nestingLevel?: number
}

type RectangleBufferCollectorOptions = {
  padding?: number
  deferredMode?: boolean
}

type PlacedRectangle = Rectangle & { originalY: number; nestingLevel?: number }

type PendingRect<T> = {
  rect: Omit<T, 'index'>
  type: number
  checkOverlap: boolean
}

export class RectangleBufferCollector<T extends RectangleBufferRect> {
  added: Set<string> = new Set()
  rects: Record<string, T> = {}
  positions: number[] = []
  indices: number[] = []
  rectId: number[] = []
  types: number[] = []
  quad: number[] = []
  state: number[] = []
  radius: number[] = []
  index = 0
  bufferInfo: BufferInfo | null = null
  placedRects: PlacedRectangle[] = []
  deferredMode: boolean = false
  pendingRects: PendingRect<T>[] = []

  constructor(options?: RectangleBufferCollectorOptions) {
    this.deferredMode = options?.deferredMode || false
  }

  reset() {
    this.added = new Set()
    // In deferred mode, only preserve rects for position stability
    // placedRects must be rebuilt each frame for accurate collision detection
    if (!this.deferredMode) {
      this.rects = {}
    }
    this.placedRects = []
    this.positions = []
    this.indices = []
    this.rectId = []
    this.types = []
    this.state = []
    this.quad = []
    this.radius = []
    this.index = 0
    this.bufferInfo = null
    this.pendingRects = []
  }

  getIdealPosition(
    x: number,
    y: number,
    width: number,
    height: number,
    isEmptyField = false,
    nestingLevel?: number,
  ): Rectangle & { nestingLevel?: number } {
    const MIN_HEIGHT = 5 // Minimum height for intersection detection

    const rect: PlacedRectangle = {
      x,
      y,
      width,
      height,
      originalY: y,
      nestingLevel,
    }

    const intersections: PlacedRectangle[] = []
    for (let i = 0; i < this.placedRects.length; i++) {
      const placed = this.placedRects[i]!

      // Use minimum height for intersection test to handle empty fields (height=0)
      const testRect = { ...rect, height: Math.max(height, MIN_HEIGHT) }
      const testPlaced = {
        ...placed,
        height: Math.max(placed.height, MIN_HEIGHT),
      }

      // For empty fields, use a buffer to also catch adjacent rects (touching edges)
      // so they can be properly centered away from nearby drop targets
      if (isEmptyField) {
        const buffer = 1
        const bufferedRect = {
          ...testRect,
          y: testRect.y - buffer,
          height: testRect.height + buffer * 2,
        }
        if (intersects(bufferedRect, testPlaced)) {
          intersections.push(placed)
        }
      } else if (intersects(testRect, testPlaced)) {
        intersections.push(placed)
      }
    }

    if (intersections.length === 0) {
      this.placedRects.push(rect)
      return rect
    }

    intersections.sort((a, b) => a.originalY - b.originalY)

    // Try centered approach: find space between rects and center in it
    // Only apply to empty field rects
    if (isEmptyField) {
      // Maximum distance we're willing to move from original position
      const MAX_DISPLACEMENT = 100

      for (let i = 0; i < intersections.length; i++) {
        const existingRect = intersections[i]!

        // Determine if intersection is above or below our original position
        const intersectionIsAbove = existingRect.y < y

        let gapStart: number
        let gapEnd: number

        if (intersectionIsAbove) {
          // Intersection is above us - look for space BELOW the intersection
          gapStart = existingRect.y + existingRect.height

          // Find the next rect below the intersection (in the same horizontal space)
          const rectsBelow = this.placedRects.filter(
            (r) =>
              r.y >= gapStart &&
              r.y <= y + MAX_DISPLACEMENT &&
              r.x < x + width &&
              r.x + r.width > x,
          )

          if (rectsBelow.length > 0) {
            gapEnd = Math.min(...rectsBelow.map((r) => r.y))
          } else {
            gapEnd = y + MAX_DISPLACEMENT
          }
        } else {
          // Intersection is below us - look for space ABOVE the intersection
          gapEnd = existingRect.y

          // Find rects above the intersection (in the same horizontal space)
          const rectsAbove = this.placedRects.filter(
            (r) =>
              r.y + r.height <= gapEnd &&
              r.y + r.height >= y - MAX_DISPLACEMENT &&
              r.x < x + width &&
              r.x + r.width > x,
          )

          if (rectsAbove.length > 0) {
            gapStart = Math.max(...rectsAbove.map((r) => r.y + r.height))
          } else {
            gapStart = Math.max(0, y - MAX_DISPLACEMENT)
          }
        }

        const availableSpace = gapEnd - gapStart

        // Try to center in the available space
        if (availableSpace >= height) {
          const centeredY = gapStart + (availableSpace - height) / 2

          // Ensure we don't move too far from original position
          if (Math.abs(centeredY - y) > MAX_DISPLACEMENT) {
            continue
          }

          const centeredRect = { ...rect, y: centeredY }

          // Verify this centered position doesn't intersect with anything
          let hasIntersection = false
          for (const placed of this.placedRects) {
            const testCentered = {
              ...centeredRect,
              height: Math.max(height, MIN_HEIGHT),
            }
            const testPlaced = {
              ...placed,
              height: Math.max(placed.height, MIN_HEIGHT),
            }
            if (intersects(testCentered, testPlaced)) {
              hasIntersection = true
              break
            }
          }

          if (!hasIntersection) {
            rect.y = centeredY
            this.placedRects.push(rect)
            return rect
          }
        }
      }
    }

    // Fallback: use directional movement if centering didn't work
    for (let i = 0; i < intersections.length; i++) {
      const existingRect = intersections[i]!
      let iterations = 0
      // Move in the direction that preserves order:
      // If new rect is above existing (smaller Y), move it UP (negative)
      // If new rect is below existing (larger Y), move it DOWN (positive)
      const direction = y < existingRect.originalY ? -1 : 1
      while (intersects(rect, existingRect) && iterations < 10) {
        rect.y = y + direction * (10 * (iterations + 1))
        iterations++
      }

      if (iterations >= 10) {
        // Set the original y coordinate when we had too many iterations, so
        // that the rectangle is not completely off where it should be.
        rect.y = y
      }
    }

    this.placedRects.push(rect)
    return rect
  }

  addRectangle(rect: Omit<T, 'index'>, type: number, checkOverlap = false) {
    // In deferred mode, just collect the rectangle for later processing
    if (this.deferredMode) {
      this.pendingRects.push({ rect, type, checkOverlap })
      return
    }

    // Immediate mode: process right away (backwards compatible behavior)
    const { x, y, width, height } = checkOverlap
      ? this.getIdealPosition(rect.x, rect.y, rect.width, rect.height)
      : rect

    // Push the positions of the corners of the rectangle
    this.positions.push(
      x,
      y, // Lower left corner
      0,
      x + width,
      y, // Lower right corner
      1,
      x + width,
      y + height, // Upper right corner
      2,
      x,
      y + height, // Upper left corner
      3,
    )

    // Calculate indices for this rectangle
    const baseIndex = 4 * this.index // Each rectangle has 4 vertices
    this.indices.push(
      baseIndex,
      baseIndex + 1,
      baseIndex + 2, // First triangle
      baseIndex,
      baseIndex + 2,
      baseIndex + 3, // Second triangle
    )
    const r = rect.radius || [4, 4, 4, 4]
    this.radius.push(...r)
    this.radius.push(...r)
    this.radius.push(...r)
    this.radius.push(...r)
    this.rectId.push(this.index, this.index, this.index, this.index)
    this.types.push(type, type, type, type)
    this.quad.push(x, y, width, height)
    this.quad.push(x, y, width, height)
    this.quad.push(x, y, width, height)
    this.quad.push(x, y, width, height)
    const state = rect.state || 0
    this.state.push(state, state, state, state)

    this.rects[rect.id] = {
      ...rect,
      index: this.index,
      x,
      y,
      width,
      height,
    } as any
    this.added.add(rect.id)

    this.index++
  }

  processPendingRects() {
    if (!this.deferredMode) {
      return
    }

    if (!this.pendingRects.length) {
      return
    }

    // Sort by Y position (top to bottom) to preserve initial order.
    const sortedPending = [...this.pendingRects].sort(
      (a, b) => a.rect.y - b.rect.y,
    )

    // First iteration: Process non-empty field rects.
    // Second iteration: Process empty field rects (now that all other rects are placed).

    const passes = [
      sortedPending.filter((p) => !p.rect.id.includes(':empty:')), // Non-empty rects
      sortedPending.filter((p) => p.rect.id.includes(':empty:')), // Empty rects
    ]

    for (const pass of passes) {
      for (const { rect, type, checkOverlap } of pass) {
        // Skip if already added this frame
        if (this.added.has(rect.id)) {
          continue
        }

        let finalPosition: Rectangle

        // Check if we already have a stable position for this rect ID
        const existing = this.rects[rect.id]
        if (existing) {
          // Reuse stable position from previous frame
          finalPosition = {
            x: existing.x,
            y: existing.y,
            width: existing.width,
            height: existing.height,
          }
        } else if (checkOverlap) {
          // New rect needing overlap resolution
          // Check if this is an empty field rect (ID contains ':empty:')
          const isEmptyField = rect.id.includes(':empty:')
          finalPosition = this.getIdealPosition(
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            isEmptyField,
            rect.nestingLevel,
          )
        } else {
          // New rect without overlap checking
          finalPosition = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }
        }

        // Write to buffers with final position
        const { x, y, width, height } = finalPosition

        this.positions.push(
          x,
          y, // Lower left corner
          0,
          x + width,
          y, // Lower right corner
          1,
          x + width,
          y + height, // Upper right corner
          2,
          x,
          y + height, // Upper left corner
          3,
        )

        const baseIndex = 4 * this.index
        this.indices.push(
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex,
          baseIndex + 2,
          baseIndex + 3,
        )

        const r = rect.radius || [4, 4, 4, 4]
        this.radius.push(...r, ...r, ...r, ...r)
        this.rectId.push(this.index, this.index, this.index, this.index)
        this.types.push(type, type, type, type)
        this.quad.push(x, y, width, height)
        this.quad.push(x, y, width, height)
        this.quad.push(x, y, width, height)
        this.quad.push(x, y, width, height)

        const state = rect.state || 0
        this.state.push(state, state, state, state)

        this.rects[rect.id] = {
          ...rect,
          index: this.index,
          x,
          y,
          width,
          height,
        } as any
        this.added.add(rect.id)

        this.index++
      }

      this.pendingRects = []
    }
  }

  getIndex(id: string): number | undefined {
    return this.rects[id]?.index
  }

  updateRectangle() {
    // @TODO: Explore possibility to update individual rectangles in the
    // buffer.
  }

  createBufferInfo(gl: WebGLRenderingContext): BufferInfo {
    return createBufferInfoFromArrays(gl, {
      a_position: {
        numComponents: 3,
        data: this.positions,
        type: gl.FLOAT,
      },
      a_rect_id: {
        numComponents: 1,
        data: this.rectId,
        type: gl.FLOAT,
      },
      a_state: {
        numComponents: 1,
        data: this.state,
        type: gl.FLOAT,
      },
      a_rect_type: {
        numComponents: 1,
        data: this.types,
        type: gl.FLOAT,
      },
      a_rect_radius: {
        numComponents: 4,
        data: this.radius,
        type: gl.FLOAT,
      },
      a_quad: {
        numComponents: 4,
        data: this.quad,
        type: gl.FLOAT,
      },
      indices: this.indices,
    })
  }
}
