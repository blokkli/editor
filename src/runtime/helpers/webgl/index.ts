import type { Rectangle } from '#blokkli/types'
import { createBufferInfoFromArrays, type BufferInfo } from 'twgl.js'
import { intersects } from '..'

type RectangleBufferRect = Rectangle & {
  id: string
  index: number
  radius?: [number, number, number, number]
  state?: number
}

type RectangleBufferCollectorOptions = {
  padding?: number
  deferredMode?: boolean
}

type PlacedRectangle = Rectangle & { originalY: number }

type PendingRect<T> = {
  rect: Omit<T, 'index'>
  type: number
  checkOverlap: boolean
}

export class RectangleBufferCollector<T extends RectangleBufferRect> {
  gl?: WebGLRenderingContext
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

  constructor(
    gl?: WebGLRenderingContext,
    options?: RectangleBufferCollectorOptions,
  ) {
    this.gl = gl
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
  ): Rectangle {
    const MIN_HEIGHT = 5 // Minimum height for intersection detection

    const rect: PlacedRectangle = {
      x,
      y,
      width,
      height,
      originalY: y,
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

      if (intersects(testRect, testPlaced)) {
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
      for (let i = 0; i < intersections.length; i++) {
        const existingRect = intersections[i]!

        // Find rects above this intersection (in the same horizontal space)
        const rectsAbove = this.placedRects.filter(
          (r) =>
            r.y + r.height <= existingRect.y &&
            r.x < x + width &&
            r.x + r.width > x,
        )

        // Calculate the bottom edge of the highest rect above
        let prevBottom = 0
        if (rectsAbove.length > 0) {
          prevBottom = Math.max(...rectsAbove.map((r) => r.y + r.height))
        }

        const nextTop = existingRect.y
        const availableSpace = nextTop - prevBottom

        // Try to center in the available space
        if (availableSpace >= height) {
          const centeredY = prevBottom + (availableSpace - height) / 2
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

  createBufferInfo(): BufferInfo | null {
    if (!this.gl) {
      return null
    }
    return createBufferInfoFromArrays(this.gl, {
      a_position: {
        numComponents: 3,
        data: this.positions,
        type: this.gl.FLOAT,
      },
      a_rect_id: {
        numComponents: 1,
        data: this.rectId,
        type: this.gl.FLOAT,
      },
      a_state: {
        numComponents: 1,
        data: this.state,
        type: this.gl.FLOAT,
      },
      a_rect_type: {
        numComponents: 1,
        data: this.types,
        type: this.gl.FLOAT,
      },
      a_rect_radius: {
        numComponents: 4,
        data: this.radius,
        type: this.gl.FLOAT,
      },
      a_quad: {
        numComponents: 4,
        data: this.quad,
        type: this.gl.FLOAT,
      },
      indices: this.indices,
    })
  }
}
