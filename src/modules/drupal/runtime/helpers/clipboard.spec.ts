import { describe, expect, test } from 'vitest'
import { isFileAccepted } from './clipboard'

const image = { fileExtensions: ['png', 'jpg', 'jpeg'], maxFileSize: 1000 }

describe('isFileAccepted', () => {
  test('accepts an allowed extension, ignoring case', () => {
    expect(isFileAccepted({ fileName: 'photo.png', fileSize: 10 }, image)).toBe(
      true,
    )
    expect(isFileAccepted({ fileName: 'PHOTO.JPG', fileSize: 10 }, image)).toBe(
      true,
    )
  })

  test('refuses another extension', () => {
    expect(isFileAccepted({ fileName: 'photo.gif', fileSize: 10 }, image)).toBe(
      false,
    )
    expect(isFileAccepted({ fileName: 'png', fileSize: 10 }, image)).toBe(false)
    expect(
      isFileAccepted({ fileName: 'photo.png.exe', fileSize: 10 }, image),
    ).toBe(false)
  })

  test('accepts an extension with a dot', () => {
    const archive = { fileExtensions: ['tar.gz'], maxFileSize: 0 }
    expect(
      isFileAccepted({ fileName: 'a.tar.gz', fileSize: 10 }, archive),
    ).toBe(true)
    expect(isFileAccepted({ fileName: 'a.gz', fileSize: 10 }, archive)).toBe(
      false,
    )
  })

  test('accepts any extension when none is set', () => {
    const any = { fileExtensions: [''], maxFileSize: 0 }
    expect(isFileAccepted({ fileName: 'notes.xyz', fileSize: 10 }, any)).toBe(
      true,
    )
  })

  test('refuses a file larger than the maximum', () => {
    expect(
      isFileAccepted({ fileName: 'photo.png', fileSize: 1000 }, image),
    ).toBe(true)
    expect(
      isFileAccepted({ fileName: 'photo.png', fileSize: 1001 }, image),
    ).toBe(false)
  })

  test('accepts any size without a maximum', () => {
    const unlimited = { fileExtensions: ['png'], maxFileSize: 0 }
    expect(
      isFileAccepted({ fileName: 'photo.png', fileSize: 10 ** 9 }, unlimited),
    ).toBe(true)
  })

  test("skips what a drag doesn't tell", () => {
    // While dragged, a file has no name and a size of 0.
    expect(isFileAccepted({ fileSize: 0 }, image)).toBe(true)
    expect(isFileAccepted({ fileSize: 1001 }, image)).toBe(false)
    expect(isFileAccepted({ fileName: 'photo.gif', fileSize: 0 }, image)).toBe(
      false,
    )
  })
})
