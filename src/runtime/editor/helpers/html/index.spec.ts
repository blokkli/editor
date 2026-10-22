// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { parseHtml } from './index'

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
