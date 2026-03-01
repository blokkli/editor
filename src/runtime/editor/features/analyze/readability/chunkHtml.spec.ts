/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest'
import { chunkHtml } from './chunkHtml'

describe('chunkHtml', () => {
  describe('plain fields', () => {
    it('returns a single chunk for plain text', () => {
      const result = chunkHtml('Hello world', 'plain')
      expect(result).toEqual([{ text: 'Hello world' }])
    })

    it('trims whitespace', () => {
      const result = chunkHtml('  Hello world  ', 'plain')
      expect(result).toEqual([{ text: 'Hello world' }])
    })

    it('returns empty array for empty string', () => {
      expect(chunkHtml('', 'plain')).toEqual([])
    })

    it('returns empty array for whitespace-only string', () => {
      expect(chunkHtml('   ', 'plain')).toEqual([])
    })
  })

  describe('markup fields', () => {
    it('splits paragraphs into separate chunks', () => {
      const result = chunkHtml(
        '<p>First paragraph.</p><p>Second paragraph.</p>',
        'markup',
      )
      expect(result).toHaveLength(2)
      expect(result[0]!.text).toBe('First paragraph.')
      expect(result[1]!.text).toBe('Second paragraph.')
    })

    it('preserves innerHTML in html property', () => {
      const result = chunkHtml('<p><strong>Bold</strong> text</p>', 'markup')
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe('Bold text')
      expect(result[0]!.html).toBe('<strong>Bold</strong> text')
    })

    it('handles nested block elements', () => {
      const result = chunkHtml(
        '<div><p>Paragraph inside div.</p><p>Another paragraph.</p></div>',
        'markup',
      )
      expect(result).toHaveLength(2)
      expect(result[0]!.text).toBe('Paragraph inside div.')
      expect(result[1]!.text).toBe('Another paragraph.')
    })

    it('handles list items', () => {
      const result = chunkHtml(
        '<ul><li>Item one</li><li>Item two</li></ul>',
        'markup',
      )
      expect(result).toHaveLength(2)
      expect(result[0]!.text).toBe('Item one')
      expect(result[1]!.text).toBe('Item two')
    })

    it('handles headings', () => {
      const result = chunkHtml(
        '<h2>A Heading</h2><p>Some body text.</p>',
        'markup',
      )
      expect(result).toHaveLength(2)
      expect(result[0]!.text).toBe('A Heading')
      expect(result[1]!.text).toBe('Some body text.')
    })

    it('treats inline-only HTML as a single chunk', () => {
      const result = chunkHtml(
        '<strong>Bold</strong> and <em>italic</em>',
        'markup',
      )
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe('Bold and italic')
    })

    it('skips empty block elements', () => {
      const result = chunkHtml('<p></p><p>Non-empty.</p>', 'markup')
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe('Non-empty.')
    })

    it('skips script and style elements', () => {
      const result = chunkHtml(
        '<p>Text</p><script>alert("hi")</script><style>.x{}</style>',
        'markup',
      )
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe('Text')
    })

    it('returns empty array for empty markup', () => {
      expect(chunkHtml('', 'markup')).toEqual([])
    })

    it('handles whitespace-only markup', () => {
      expect(chunkHtml('   ', 'markup')).toEqual([])
    })

    it('handles complex nested structure', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <div>
            <p>First paragraph with <a href="#">a link</a>.</p>
            <blockquote>A quote.</blockquote>
          </div>
        </div>
      `
      const result = chunkHtml(html, 'markup')
      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.map((c) => c.text)).toContain('Title')
      expect(result.map((c) => c.text)).toContain('A quote.')
    })
  })
})
