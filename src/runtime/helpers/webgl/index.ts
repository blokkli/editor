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
}

type PlacedRectangle = Rectangle & { originalY: number }

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

  constructor(
    gl?: WebGLRenderingContext,
    _options?: RectangleBufferCollectorOptions,
  ) {
    this.gl = gl
  }

  reset() {
    this.added = new Set()
    this.rects = {}
    this.positions = []
    this.indices = []
    this.rectId = []
    this.types = []
    this.state = []
    this.quad = []
    this.radius = []
    this.index = 0
    this.bufferInfo = null
  }

  getIdealPosition(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Rectangle {
    const rect: PlacedRectangle = {
      x,
      y,
      width,
      height,
      originalY: y,
    }

    const intersections: PlacedRectangle[] = []
    for (let i = 0; i < this.placedRects.length; i++) {
      if (intersects(rect, this.placedRects[i])) {
        intersections.push(this.placedRects[i])
      }
    }

    if (intersections.length === 0) {
      this.placedRects.push(rect)
      return rect
    }

    intersections.sort((a, b) => b.originalY - a.originalY)

    for (let i = 0; i < intersections.length; i++) {
      const existingRect = intersections[i]
      let iterations = 0
      const direction = y > existingRect.originalY ? -1 : 1
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

  getIndex(id: string): number | undefined {
    return this.rects[id].index || undefined
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
