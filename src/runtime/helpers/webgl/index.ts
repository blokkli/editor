import type { Rectangle } from '#blokkli/types'
import { createBufferInfoFromArrays, type BufferInfo } from 'twgl.js'

type RectangleBufferRect = Rectangle & {
  id: string
  index: number
  radius?: [number, number, number, number]
}

type RectangleBufferCollectorOptions = {
  padding?: number
}

export class RectangleBufferCollector<T extends RectangleBufferRect> {
  gl: WebGLRenderingContext
  added: Set<string> = new Set()
  rects: Record<string, T> = {}
  positions: number[] = []
  indices: number[] = []
  rectId: number[] = []
  types: number[] = []
  quad: number[] = []
  radius: number[] = []
  index = 0
  bufferInfo: BufferInfo | null = null

  constructor(
    gl: WebGLRenderingContext,
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
    this.quad = []
    this.radius = []
    this.index = 0
    this.bufferInfo = null
  }

  addRectangle(rect: Omit<T, 'index'>, type: number) {
    const x = rect.x
    const y = rect.y
    const width = rect.width
    const height = rect.height
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

  createBufferInfo(): BufferInfo {
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
