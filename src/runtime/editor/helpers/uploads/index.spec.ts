import { describe, expect, test } from 'vitest'
import { getUploadFileInfo, getUploadType } from './index'

describe('getUploadType', () => {
  test('images are uploaded as images, anything else as a file', () => {
    expect(getUploadType('image/png')).toBe('image')
    expect(getUploadType('application/pdf')).toBe('file')
    expect(getUploadType('')).toBe('file')
  })
})

describe('getUploadFileInfo', () => {
  test("has the file's type, size and name", () => {
    const file = { name: 'cat.png', type: 'image/png', size: 100 } as File
    expect(getUploadFileInfo(file)).toEqual({
      type: 'image',
      fileType: 'image/png',
      fileSize: 100,
      fileName: 'cat.png',
    })
  })
})
