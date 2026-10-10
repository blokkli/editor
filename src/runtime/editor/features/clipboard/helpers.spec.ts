import { describe, expect, test } from 'vitest'
import { buildFileMapEvent, buildMapBundleEvents } from './helpers'

/**
 * A drag event whose items have the kinds and types, and the files, if the
 * browser gives them.
 */
function buildDragEvent(
  items: Array<{ kind: string; type: string; file?: Partial<File> }>,
): DragEvent {
  return {
    dataTransfer: {
      items: items.map(({ kind, type, file }) => ({
        kind,
        type,
        getAsFile: () => file ?? null,
      })),
    },
  } as unknown as DragEvent
}

describe('buildMapBundleEvents', () => {
  test('builds an event for every file', () => {
    const e = buildDragEvent([
      { kind: 'file', type: 'image/png' },
      {
        kind: 'file',
        type: 'application/pdf',
        file: { name: 'report.pdf', size: 1200 },
      },
    ])
    expect(buildMapBundleEvents(e)).toEqual([
      {
        type: 'image',
        fileType: 'image/png',
        fileSize: 0,
        fileName: undefined,
      },
      {
        type: 'file',
        fileType: 'application/pdf',
        fileSize: 1200,
        fileName: 'report.pdf',
      },
    ])
  })

  test('builds one event for text', () => {
    const e = buildDragEvent([
      { kind: 'string', type: 'text/plain' },
      { kind: 'string', type: 'text/html' },
    ])
    expect(buildMapBundleEvents(e)).toEqual([{ type: 'plaintext', text: '' }])
  })

  test('builds none without items', () => {
    expect(buildMapBundleEvents(buildDragEvent([]))).toEqual([])
  })
})

describe('buildFileMapEvent', () => {
  test("has the file's type, size and name", () => {
    const file = { name: 'photo.jpg', type: 'image/jpeg', size: 300 } as File
    expect(buildFileMapEvent(file)).toEqual({
      type: 'image',
      fileType: 'image/jpeg',
      fileSize: 300,
      fileName: 'photo.jpg',
    })
  })
})
