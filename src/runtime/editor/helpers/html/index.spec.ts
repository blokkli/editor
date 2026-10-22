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

describe("sanitizeHtml's comment profile", () => {
  it('keeps what the comment editor writes', () => {
    const html = [
      '<p>Hi <span class="bk-richtext-mention" data-type="mention" data-id="2" data-label="Martin">@Martin</span>, <strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code> <a href="https://example.com/">link</a> <span data-type="emoji" data-name="smile">😄</span><br>next</p>',
      '<blockquote><p>Quote</p></blockquote>',
      '<ul><li><p>One</p><ol><li><p>Two</p></li></ol></li></ul>',
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul>',
    ].join('')
    expect(sanitizeHtml(html, 'comment')).toBe(html)
  })

  it('removes what the comment editor never writes, keeping its text', () => {
    expect(
      sanitizeHtml(
        '<h2>Title</h2><p style="color: red" data-x="1">A <img src="https://example.com/a.png">b</p><table><tbody><tr><td>c</td></tr></tbody></table>',
        'comment',
      ),
    ).toBe('Title<p>A b</p>c')
  })
})
