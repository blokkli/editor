// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import {
  parseHtml,
  parseHtmlDocument,
  sanitizeHtml,
  setInertHtml,
  setSanitizedHtml,
} from './index'

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

describe('parseHtmlDocument', () => {
  it('parses into a document without a window', () => {
    const doc = parseHtmlDocument('<p>One</p><p>Two</p>')
    expect(doc.defaultView).toBeNull()
    expect(doc.body.textContent).toBe('OneTwo')
  })
})

describe('setInertHtml', () => {
  it('sets the markup of an element of a document without a window', () => {
    const element = parseHtmlDocument('<div id="a"></div>').getElementById('a')!
    setInertHtml(element, '<p>One</p>')
    expect(element.innerHTML).toBe('<p>One</p>')
  })

  it('refuses an element of the page', () => {
    expect(() =>
      setInertHtml(document.createElement('div'), '<p>One</p>'),
    ).toThrow()
  })
})

describe('setSanitizedHtml', () => {
  it('sets the markup that sanitizeHtml() keeps', () => {
    const element = document.createElement('div')
    setSanitizedHtml(
      element,
      '<style>p {}</style><p class="lead">A</p>',
      'richText',
    )
    expect(element.innerHTML).toBe('<p class="lead">A</p>')
  })
})

type PolicyRules = {
  createHTML(html: string): unknown
  createScriptURL(url: string): unknown
}

/** A stand-in for the browser's `trustedTypes`, which jsdom doesn't have. */
function setTrustedTypes(
  createPolicy: ((name: string, rules: PolicyRules) => PolicyRules) | null,
) {
  const global = globalThis as { trustedTypes?: unknown }
  if (createPolicy) {
    global.trustedTypes = { createPolicy }
  } else {
    delete global.trustedTypes
  }
}

describe("the editor's Trusted Types policy", () => {
  // A fresh module per test: the policy is created on first use.
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    setTrustedTypes(null)
  })

  it('is created once, as `blokkli`, for the markup the editor parses', async () => {
    const vouched: string[] = []
    const createPolicy = vi.fn((_name: string, rules: PolicyRules) => ({
      createHTML: (html: string) => {
        vouched.push(html)
        return rules.createHTML(html)
      },
      createScriptURL: rules.createScriptURL,
    }))
    setTrustedTypes(createPolicy)
    const html = await import('./index')

    expect(html.parseHtml('<p>One</p>').textContent).toBe('One')
    expect(html.parseHtmlDocument('<p>Two</p>').body.textContent).toBe('Two')
    expect(html.sanitizeHtml('<p>Three</p>', 'richText')).toBe('<p>Three</p>')

    expect(createPolicy).toHaveBeenCalledOnce()
    const [name, rules] = createPolicy.mock.calls[0]!
    expect(name).toBe('blokkli')
    expect(vouched).toEqual(
      expect.arrayContaining(['<p>One</p>', '<p>Two</p>', '<p>Three</p>']),
    )
    // It vouches for no script URL.
    expect(() => rules.createScriptURL('/a.js')).toThrow()
  })

  it('passes strings when the page refuses the name', async () => {
    setTrustedTypes(() => {
      throw new TypeError('Refused.')
    })
    const html = await import('./index')
    expect(html.parseHtml('<p>One</p>').innerHTML).toBe('<p>One</p>')
    expect(html.sanitizeHtml('<p>Two</p>', 'richText')).toBe('<p>Two</p>')
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

  it('removes base, link and meta elements', () => {
    expect(
      sanitizeHtml(
        '<base href="https://example.com/"><link rel="stylesheet" href="/a.css"><meta name="a" content="b"><p>A</p>',
        'richText',
      ),
    ).toBe('<p>A</p>')
  })

  it('removes the URLs of links with other protocols', () => {
    expect(
      sanitizeHtml(
        '<p><a href="javascript:void(0)">a</a> <a href="data:text/plain,b">b</a></p>',
        'richText',
      ),
    ).toBe('<p><a>a</a> <a>b</a></p>')
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
