// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { applyOperations, applySelectorOperation } from './helpers'

/**
 * `applySelectorOperation` parses the whole field, replaces one element's
 * innerHTML and serializes everything back. That round-trip is only safe when
 * the parser reproduces its input exactly.
 *
 * It used to be handed the RENDERED value, which had already been through the
 * browser's parser, so re-parsing was a no-op. It is now handed the RAW stored
 * value, where the parser can restructure content it was never asked to touch.
 * When the round-trip is not faithful the operation must decline rather than
 * rewrite untouched content — a visible no-op instead of silent corruption.
 */
describe('applySelectorOperation', () => {
  it('applies the replacement when the value round-trips faithfully', () => {
    expect(
      applySelectorOperation('<p>A</p><p>Alt</p>', 'p:nth-child(2)', 'Neu'),
    ).toBe('<p>A</p><p>Neu</p>')
  })

  it('does not nest following content into a self-closed custom element', () => {
    // `<drupal-media … />` is not void HTML: the parser treats it as an open
    // tag and swallows every following sibling into it.
    const stored = '<drupal-media data-uuid="x" /><p>After</p>'
    expect(applySelectorOperation(stored, 'p', 'Neu')).toBe(
      '<drupal-media data-uuid="x" /><p>Neu</p>',
    )
  })

  it('does not destroy a table-row fragment', () => {
    // `<tr>` cannot live directly in <body>; the parser drops the tags and
    // keeps only the text.
    const stored = '<tr><td>A</td></tr>'
    expect(applySelectorOperation(stored, 'td', 'Neu')).toContain('<td>')
  })

  it('leaves an untouched sibling byte-identical', () => {
    const stored = "<p>A<br />B</p><p class='intro'>Alt</p>"
    const result = applySelectorOperation(stored, 'p:nth-child(2)', 'Neu')
    expect(result).toContain('<p>A<br />B</p>')
  })

  it('preserves entities in untouched content', () => {
    const stored = '<p>Preis 10 &mdash; inkl. &quot;MwSt&quot;</p><p>Alt</p>'
    const result = applySelectorOperation(stored, 'p:nth-child(2)', 'Neu')
    expect(result).toContain('&mdash;')
    expect(result).toContain('&quot;')
  })

  it('preserves a top-level HTML comment', () => {
    const stored = '<!-- TODO --><p>Alt</p>'
    const result = applySelectorOperation(stored, 'p', 'Neu')
    expect(result).toContain('<!-- TODO -->')
  })
})

describe('applyOperations', () => {
  it('does not corrupt the field when a selector operation cannot apply safely', () => {
    const stored = '<drupal-media data-uuid="x" /><p>Alt</p>'
    const result = applyOperations(stored, [
      { search: 'p', replace: 'Neu', selector: true },
    ])
    expect(result).not.toContain('</drupal-media>')
  })

  it('still applies plain search/replace operations verbatim', () => {
    expect(
      applyOperations('<p>Preis 10 &mdash; alt</p>', [
        { search: 'alt', replace: 'neu' },
      ]),
    ).toBe('<p>Preis 10 &mdash; neu</p>')
  })
})
