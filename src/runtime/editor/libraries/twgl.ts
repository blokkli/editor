import {
  createProgramInfo,
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  createBufferInfoFromArrays,
} from 'twgl.js'

export const twgl = {
  createProgramInfo,
  setBuffersAndAttributes,
  drawBufferInfo,
  setUniforms,
  createBufferInfoFromArrays,
}

export type TwglHelpers = typeof twgl
export type { BufferInfo, ProgramInfo } from 'twgl.js'
