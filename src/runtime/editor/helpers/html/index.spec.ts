// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseHtml, sanitizeHtml } from './index'

describe('parseHtml', () => {
  it('parses markup as a div does', () => {
    const container = parseHtml('<style>p {}</style><p>One</p><p>Two</p>')
    expect([...container.children].map((v) => v.tagName)).toEqual([
      'STYLE',
      'P',
      'P',
    ])
    expect(container.textContent).toBe('p {}OneTwo')
  })

  it('parses into a document of its own', () => {
    const container = parseHtml('<p>One</p>')
    expect(container.ownerDocument).not.toBe(document)
    expect(container.isConnected).toBe(false)
  })
})

describe('sanitizeHtml', () => {
  it('keeps rich text', () => {
    const html =
      '<h2>Title</h2><p class="lead" data-id="1">A <strong>b</strong> <a href="https://example.com/">c</a></p><ul><li>d</li></ul>'
    expect(sanitizeHtml(html, 'richText')).toBe(html)
  })

  it("keeps a diff's insertions and deletions", () => {
    const html =
      '<p><del class="diffdel">One</del><ins class="diffins">Two</ins></p>'
    expect(sanitizeHtml(html, 'richText')).toBe(html)
  })

  it('removes style elements and forms', () => {
    expect(
      sanitizeHtml(
        '<style>p {}</style><form><input name="a"><textarea></textarea></form><p>A</p>',
        'richText',
      ),
    ).toBe('<p>A</p>')
  })

  it('removes SVG and custom elements', () => {
    expect(
      sanitizeHtml(
        '<svg><circle r="1"></circle></svg><drupal-media data-entity-uuid="1"></drupal-media><p>A</p>',
        'richText',
      ),
    ).toBe('<p>A</p>')
  })
})
