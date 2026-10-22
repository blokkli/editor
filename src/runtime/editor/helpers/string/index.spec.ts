import { describe, it, expect } from 'vitest'
import { escapeHtml } from './index'

describe('escapeHtml', () => {
  it('escapes markup', () => {
    expect(escapeHtml('<img src="x" alt=\'y\'>')).toBe(
      '&lt;img src=&quot;x&quot; alt=&#39;y&#39;&gt;',
    )
  })

  it('escapes ampersands, so entities stay text', () => {
    expect(escapeHtml('&lt;b&gt; & more')).toBe('&amp;lt;b&amp;gt; &amp; more')
  })

  it('leaves other text as it is', () => {
    expect(escapeHtml('Grüezi — 100 % $1 sicher')).toBe(
      'Grüezi — 100 % $1 sicher',
    )
  })
})
