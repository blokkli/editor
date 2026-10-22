// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { parseHtml } from '#blokkli/editor/helpers/html'
import {
  buildFileMapEvent,
  buildMapBundleEvents,
  cleanPastedHtml,
  groupFileBundles,
  narrowFileGroups,
} from './helpers'

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

describe('groupFileBundles', () => {
  test('groups the files by type, with the bundles all of them have', () => {
    expect(
      groupFileBundles([
        { type: 'image', bundles: ['image', 'gallery'] },
        { type: 'file', bundles: ['document'] },
        { type: 'image', bundles: ['image'] },
      ]),
    ).toEqual([
      { type: 'image', bundles: ['image'] },
      { type: 'file', bundles: ['document'] },
    ])
  })
})

describe('narrowFileGroups', () => {
  const groups = [
    { type: 'image' as const, bundles: ['image', 'gallery'] },
    { type: 'file' as const, bundles: ['document'] },
  ]

  test('keeps the bundles that can be added', () => {
    expect(narrowFileGroups(groups, (bundle) => bundle !== 'gallery')).toEqual([
      { type: 'image', bundles: ['image'] },
      { type: 'file', bundles: ['document'] },
    ])
  })

  test('returns null when a group has none left', () => {
    expect(
      narrowFileGroups(groups, (bundle) => bundle !== 'document'),
    ).toBeNull()
  })
})

describe('cleanPastedHtml', () => {
  function clean(html: string): string {
    const container = parseHtml(html)
    cleanPastedHtml(container)
    return container.innerHTML
  }

  test('keeps links to web pages and email addresses', () => {
    const html =
      '<p>A <a href="https://example.com/">b</a> <a href="/en/c">c</a> <a href="mailto:info@example.com">d</a></p>'
    expect(clean(html)).toBe(html)
  })

  test('removes every other attribute', () => {
    expect(
      clean(
        '<p class="lead" style="color: red" id="a"><a href="https://example.com/" target="_blank" class="b">b</a></p>',
      ),
    ).toBe('<p><a href="https://example.com/">b</a></p>')
  })

  test('removes the URLs of links with other protocols', () => {
    expect(
      clean(
        '<p><a href="javascript:void(0)">a</a> <a href="data:text/plain,b">b</a></p>',
      ),
    ).toBe('<p><a>a</a> <a>b</a></p>')
  })

  test("removes the URLs of what isn't a link", () => {
    expect(
      clean('<base href="https://example.com/"><p href="/en/a">A</p>'),
    ).toBe('<base><p>A</p>')
  })

  test('removes images and line breaks, nested ones too', () => {
    expect(
      clean('<img src="/a.png"><p>A<br><span>B<img src="/b.png"></span></p>'),
    ).toBe('<p>A<span>B</span></p>')
  })
})
