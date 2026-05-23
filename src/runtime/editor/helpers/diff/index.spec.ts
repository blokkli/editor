// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { computeDiff, computeInsertion } from './index'

function d(before: string, after: string) {
  return computeDiff(before, after)
}

describe('computeDiff', () => {
  it('returns identical text unchanged', () => {
    expect(d('No changes here', 'No changes here')).toMatchInlineSnapshot(
      `"No changes here"`,
    )
  })

  it('keeps single word change as granular diff', () => {
    expect(
      d('The quick brown fox', 'The slow brown fox'),
    ).toMatchInlineSnapshot(
      `"The <del class="diffmod">quick</del><ins class="diffmod">slow</ins> brown fox"`,
    )
  })

  it('keeps two-word change as granular diff', () => {
    expect(
      d('The quick brown fox jumps', 'The slow red fox jumps'),
    ).toMatchInlineSnapshot(
      `"The <del class="diffmod">quick</del><ins class="diffmod">slow</ins> <del class="diffmod">brown</del><ins class="diffmod">red</ins> fox jumps"`,
    )
  })

  it('merges 3+ consecutive changed words', () => {
    expect(
      d('Hello world foo bar', 'Goodbye planet baz qux'),
    ).toMatchInlineSnapshot(
      `"<del>Hello world foo bar</del><ins>Goodbye planet baz qux</ins>"`,
    )
  })

  it('merges when unchanged short words sit between changed words', () => {
    expect(
      d(
        'Multilingual Support and Advanced Previewing',
        'Support for Many Languages and Better Previews',
      ),
    ).toMatchInlineSnapshot(
      `"<del>Multilingual Support and Advanced Previewing</del><ins>Support for Many Languages and Better Previews</ins>"`,
    )
  })

  it('merges changed words separated by unchanged connector', () => {
    expect(
      d('Big red and tall trees', 'Small blue and short bushes'),
    ).toMatchInlineSnapshot(
      `"<del>Big red and tall trees</del><ins>Small blue and short bushes</ins>"`,
    )
  })

  it('merges completely different long text', () => {
    expect(
      d(
        'One two three four five six seven',
        'Alpha beta gamma delta epsilon zeta eta',
      ),
    ).toMatchInlineSnapshot(
      `"<del>One two three four five six seven</del><ins>Alpha beta gamma delta epsilon zeta eta</ins>"`,
    )
  })

  it('handles HTML tags in the diff', () => {
    expect(
      d(
        '<strong>Bold text</strong> and normal',
        '<strong>New bold</strong> and changed',
      ),
    ).toMatchInlineSnapshot(
      `"<strong><del class="diffmod">Bold</del><ins class="diffmod">New</ins> <del class="diffmod">text</del><ins class="diffmod">bold</ins></strong> and <del class="diffmod">normal</del><ins class="diffmod">changed</ins>"`,
    )
  })

  it('handles additions', () => {
    expect(d('Hello world', 'Hello world and more')).toMatchInlineSnapshot(
      `"Hello world<ins class="diffins"> and more</ins>"`,
    )
  })

  it('handles deletions', () => {
    expect(d('Hello world and more', 'Hello world')).toMatchInlineSnapshot(
      `"Hello world<del class="diffdel"> and more</del>"`,
    )
  })
})

describe('computeDiff block-aware', () => {
  it('diffs within block elements without crossing boundaries', () => {
    const before = '<h2>Old Title Here</h2><p>Old paragraph text.</p>'
    const after = '<h2>New Title Here</h2><p>New paragraph text.</p>'
    const result = d(before, after)
    // h2 and p should each have their own self-contained diff
    expect(result).toContain('<h2>')
    expect(result).toContain('</h2>')
    expect(result).toContain('<p>')
    expect(result).toContain('</p>')
    // The diff markers should NOT cross from h2 into p
    expect(result).not.toContain('</h2><ins')
    expect(result).not.toContain('</h2><del')
  })

  it('handles completely rewritten block content', () => {
    const before =
      '<h2>Architectural Considerations</h2><p>It should be noted that the aforementioned considerations are complex.</p>'
    const after =
      '<h2>How blökkli is Built</h2><p>blökkli uses an adapter-based design.</p>'
    const result = d(before, after)
    // "How blökkli is Built" should be entirely within the h2
    expect(result).toMatch(/<h2>.*blökkli is Built.*<\/h2>/)
    // The paragraph content should be entirely within the p
    expect(result).toMatch(/<p>.*adapter-based.*<\/p>/)
  })

  it('handles inserted blocks', () => {
    const before = '<h2>Title</h2><p>Text</p>'
    const after = '<h2>Title</h2><h3>Subtitle</h3><p>Text</p>'
    const result = d(before, after)
    expect(result).toContain('<h3><ins>Subtitle</ins></h3>')
  })

  it('handles deleted blocks', () => {
    const before = '<h2>Title</h2><h3>Subtitle</h3><p>Text</p>'
    const after = '<h2>Title</h2><p>Text</p>'
    const result = d(before, after)
    expect(result).toContain('<h3><del>Subtitle</del></h3>')
  })

  it('falls back to flat diff for plain text', () => {
    expect(d('Hello world', 'Hello planet')).toMatchInlineSnapshot(
      `"Hello <del class="diffmod">world</del><ins class="diffmod">planet</ins>"`,
    )
  })

  it('falls back to flat diff for inline-only HTML', () => {
    expect(
      d('<strong>Bold</strong> text', '<strong>New</strong> text'),
    ).toMatchInlineSnapshot(
      `"<strong><del class="diffmod">Bold</del><ins class="diffmod">New</ins></strong> text"`,
    )
  })

  it('handles unchanged blocks', () => {
    const before = '<h2>Same Title</h2><p>Changed text here.</p>'
    const after = '<h2>Same Title</h2><p>Different text here.</p>'
    const result = d(before, after)
    expect(result).toContain('<h2>Same Title</h2>')
    expect(result).toMatch(
      /<p>.*<del.*>Changed<\/del>.*<ins.*>Different<\/ins>.*<\/p>/,
    )
  })
})

describe('computeInsertion', () => {
  it('wraps plain text in a single insertion', () => {
    expect(computeInsertion('Bonjour le monde')).toMatchInlineSnapshot(
      `"<ins>Bonjour le monde</ins>"`,
    )
  })

  it('wraps inline HTML in a single insertion', () => {
    expect(
      computeInsertion('<strong>Gras</strong> et normal'),
    ).toMatchInlineSnapshot(`"<ins><strong>Gras</strong> et normal</ins>"`)
  })

  it('wraps each block element content individually', () => {
    expect(
      computeInsertion('<h2>Titre</h2><p>Paragraphe.</p>'),
    ).toMatchInlineSnapshot(
      `"<h2><ins>Titre</ins></h2><p><ins>Paragraphe.</ins></p>"`,
    )
  })

  it('produces no deletions', () => {
    const result = computeInsertion('<p>Texte traduit</p>')
    expect(result).not.toContain('<del')
  })
})
