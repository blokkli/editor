// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import {
  computeDiff,
  computeInsertion,
  splitIntoSegments,
  segmentsHaveChanges,
  renderSegmentDiff,
  reassembleValue,
  flattenSegments,
  type Segment,
  type AtomicSegment,
} from './index'

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

describe('splitIntoSegments', () => {
  it('returns null for plain fields', () => {
    expect(splitIntoSegments('Old', 'New', 'plain')).toBeNull()
  })

  it('returns null for inline-only HTML', () => {
    expect(
      splitIntoSegments(
        '<strong>Bold</strong> text',
        '<strong>New</strong> text',
        'markup',
      ),
    ).toBeNull()
  })

  it('returns null when both sides are empty', () => {
    expect(splitIntoSegments('', '', 'markup')).toBeNull()
  })

  it('emits one atomic segment per top-level block', () => {
    const segments = splitIntoSegments(
      '<p>Old intro</p><p>Old outro</p>',
      '<p>New intro</p><p>New outro</p>',
      'markup',
    )
    expect(segments).not.toBeNull()
    expect(segments!).toHaveLength(2)
    expect(segments![0]!.kind).toBe('atomic')
    expect((segments![0] as AtomicSegment).status).toBe('matched')
    expect((segments![0] as AtomicSegment).changed).toBe(true)
    expect((segments![1] as AtomicSegment).afterHtml).toBe('New outro')
  })

  it('flags inserted and deleted blocks', () => {
    const segments = splitIntoSegments(
      '<h2>Keep</h2><p>Drop</p>',
      '<h2>Keep</h2><h3>Added</h3>',
      'markup',
    )!
    const flat = flattenSegments(segments)
    // LCS aligns the matched h2 first; the remaining p/h3 are emitted in
    // backtrack order (insert before delete in this case).
    expect(flat.map((s) => s.status).sort()).toEqual([
      'deleted',
      'inserted',
      'matched',
    ])
    expect(flat.map((s) => s.tag).sort()).toEqual(['h2', 'h3', 'p'])
  })

  it('recurses into changed <ul>', () => {
    const segments = splitIntoSegments(
      '<p>Intro</p><ul><li>A</li><li>B</li><li>C</li></ul>',
      '<p>Intro</p><ul><li>A2</li><li>B</li><li>C2</li></ul>',
      'markup',
    )!
    expect(segments).toHaveLength(2)
    expect(segments[1]!.kind).toBe('list')
    const list = segments[1] as Extract<Segment, { kind: 'list' }>
    expect(list.children).toHaveLength(3)
    expect(list.children.map((c) => c.changed)).toEqual([true, false, true])
    expect(list.children.map((c) => c.id)).toEqual(['1/0', '1/1', '1/2'])
  })

  it('does not recurse into an unchanged <ul>', () => {
    const segments = splitIntoSegments(
      '<p>Old</p><ul><li>A</li><li>B</li></ul>',
      '<p>New</p><ul><li>A</li><li>B</li></ul>',
      'markup',
    )!
    expect(segments[1]!.kind).toBe('atomic')
    expect((segments[1] as AtomicSegment).changed).toBe(false)
  })

  it('handles <li> insertion and deletion inside <ul>', () => {
    const segments = splitIntoSegments(
      '<ul><li>A</li><li>B</li></ul>',
      '<ul><li>A</li><li>B</li><li>C</li></ul>',
      'markup',
    )!
    const list = segments[0] as Extract<Segment, { kind: 'list' }>
    expect(list.children).toHaveLength(3)
    expect(list.children[2]!.status).toBe('inserted')
    expect(list.children[2]!.afterHtml).toBe('C')
  })

  it('keeps <li> attributes through the recursion', () => {
    const segments = splitIntoSegments(
      '<ul><li class="x">A</li></ul>',
      '<ul><li class="x">A2</li></ul>',
      'markup',
    )!
    const list = segments[0] as Extract<Segment, { kind: 'list' }>
    expect(list.children[0]!.openTag).toBe('<li class="x">')
  })
})

describe('segmentsHaveChanges', () => {
  it('is false when every block matches unchanged', () => {
    const segments = splitIntoSegments(
      '<p>Same</p><p>Same</p>',
      '<p>Same</p><p>Same</p>',
      'markup',
    )!
    expect(segmentsHaveChanges(segments)).toBe(false)
  })

  it('is true when a single <li> changed inside an otherwise stable list', () => {
    const segments = splitIntoSegments(
      '<ul><li>A</li><li>B</li></ul>',
      '<ul><li>A</li><li>B2</li></ul>',
      'markup',
    )!
    expect(segmentsHaveChanges(segments)).toBe(true)
  })
})

describe('renderSegmentDiff', () => {
  it('annotates every atomic block with data-chunk-index', () => {
    const segments = splitIntoSegments(
      '<p>A</p><p>B</p>',
      '<p>A2</p><p>B2</p>',
      'markup',
    )!
    const html = renderSegmentDiff(segments)
    expect(html).toContain('data-chunk-index="0"')
    expect(html).toContain('data-chunk-index="1"')
  })

  it('annotates <li> children with slash-separated ids', () => {
    const segments = splitIntoSegments(
      '<ul><li>A</li><li>B</li></ul>',
      '<ul><li>A2</li><li>B2</li></ul>',
      'markup',
    )!
    const html = renderSegmentDiff(segments)
    expect(html).toContain('data-chunk-index="0/0"')
    expect(html).toContain('data-chunk-index="0/1"')
    // The list wrapper itself isn't toggleable, so it has no id.
    expect(html).not.toContain('data-chunk-index="0"')
  })

  it('uses word-diff for matched changed blocks by default', () => {
    const segments = splitIntoSegments('<p>Old</p>', '<p>New</p>', 'markup')!
    const html = renderSegmentDiff(segments)
    expect(html).toMatch(/<del[^>]*>Old<\/del>/)
    expect(html).toMatch(/<ins[^>]*>New<\/ins>/)
  })

  it('wraps as a single insertion in insertionsOnly mode', () => {
    const segments = splitIntoSegments(
      '<p>Quelle</p>',
      '<p>Traduction</p>',
      'markup',
    )!
    const html = renderSegmentDiff(segments, { insertionsOnly: true })
    expect(html).toContain('<ins>Traduction</ins>')
    expect(html).not.toContain('<del')
  })

  it('wraps inserted blocks in <ins> and deleted blocks in <del>', () => {
    const segments = splitIntoSegments(
      '<h2>Keep</h2><p>Drop</p>',
      '<h2>Keep</h2><h3>Added</h3>',
      'markup',
    )!
    const html = renderSegmentDiff(segments)
    // The two non-match entries are emitted in LCS backtrack order; we just
    // care that each carries the right tag wrapper plus a stable id.
    expect(html).toMatch(/<p data-chunk-index="\d+"><del>Drop<\/del><\/p>/)
    expect(html).toMatch(/<h3 data-chunk-index="\d+"><ins>Added<\/ins><\/h3>/)
  })

  it('reverts a rejected matched chunk to its original content', () => {
    const segments = splitIntoSegments(
      '<p>A</p><p>B</p>',
      '<p>A2</p><p>B2</p>',
      'markup',
    )!
    const html = renderSegmentDiff(segments, { acceptedById: { '0': false } })
    // Segment 0 (rejected) renders plain "A" — no diff markers.
    expect(html).toContain('<p data-chunk-index="0">A</p>')
    // Segment 1 (still accepted) still carries a diff: contains the new
    // content and at least one diff marker.
    expect(html).toMatch(/<p data-chunk-index="1">[^<]*B[^<]*<ins/)
  })

  it('renders a rejected insertion as a deletion (still in the DOM)', () => {
    const segments = splitIntoSegments(
      '<p>Keep</p>',
      '<p>Keep</p><h3>Added</h3>',
      'markup',
    )!
    const html = renderSegmentDiff(segments, { acceptedById: { '1': false } })
    expect(html).toContain('<h3 data-chunk-index="1"><del>Added</del></h3>')
  })

  it('renders a rejected deletion as plain (the block stays)', () => {
    const segments = splitIntoSegments(
      '<p>Keep</p><h3>Removed</h3>',
      '<p>Keep</p>',
      'markup',
    )!
    const html = renderSegmentDiff(segments, { acceptedById: { '1': false } })
    expect(html).toContain('<h3 data-chunk-index="1">Removed</h3>')
    expect(html).not.toMatch(/<h3[^>]*><del>Removed/)
  })

  it('reverts a rejected <li> while keeping siblings as diffs', () => {
    const segments = splitIntoSegments(
      '<ul><li>A</li><li>B</li><li>C</li></ul>',
      '<ul><li>A2</li><li>B2</li><li>C2</li></ul>',
      'markup',
    )!
    const html = renderSegmentDiff(segments, {
      acceptedById: { '0/1': false },
    })
    expect(html).toContain('<li data-chunk-index="0/1">B</li>')
    // The other two list items still show a diff marker.
    expect(html).toMatch(/<li data-chunk-index="0\/0">[^<]*A[^<]*<ins/)
    expect(html).toMatch(/<li data-chunk-index="0\/2">[^<]*C[^<]*<ins/)
  })
})

describe('reassembleValue', () => {
  it('returns the after value when every segment is accepted', () => {
    const segments = splitIntoSegments(
      '<p>Old</p><p>Old2</p>',
      '<p>New</p><p>New2</p>',
      'markup',
    )!
    expect(reassembleValue(segments, {})).toBe('<p>New</p><p>New2</p>')
  })

  it('returns the before value when every segment is rejected', () => {
    const segments = splitIntoSegments(
      '<p>Old</p><p>Old2</p>',
      '<p>New</p><p>New2</p>',
      'markup',
    )!
    expect(reassembleValue(segments, { '0': false, '1': false })).toBe(
      '<p>Old</p><p>Old2</p>',
    )
  })

  it("keeps the rejected <li>'s original content", () => {
    // The user's case: rewrite a multi-item list, reject only one <li>.
    const segments = splitIntoSegments(
      '<p>Intro</p><ul><li>Original A</li><li>Original B</li><li>Original C</li></ul><p>Outro</p>',
      '<p>New intro</p><ul><li>New A</li><li>New B</li><li>New C</li></ul><p>New outro</p>',
      'markup',
    )!
    // Accept everything except the middle <li>.
    const result = reassembleValue(segments, { '1/1': false })
    expect(result).toBe(
      '<p>New intro</p><ul><li>New A</li><li>Original B</li><li>New C</li></ul><p>New outro</p>',
    )
  })

  it('drops a rejected insertion', () => {
    const segments = splitIntoSegments(
      '<p>Keep</p>',
      '<p>Keep</p><h3>Added</h3>',
      'markup',
    )!
    expect(reassembleValue(segments, { '1': false })).toBe('<p>Keep</p>')
  })

  it('restores a rejected deletion', () => {
    const segments = splitIntoSegments(
      '<p>Keep</p><h3>Removed</h3>',
      '<p>Keep</p>',
      'markup',
    )!
    expect(reassembleValue(segments, { '1': false })).toBe(
      '<p>Keep</p><h3>Removed</h3>',
    )
  })

  it('drops the <ul> wrapper when every child is dropped', () => {
    const segments = splitIntoSegments(
      '<p>Keep</p>',
      '<p>Keep</p><ul><li>A</li><li>B</li></ul>',
      'markup',
    )!
    // The list itself was inserted whole — rejecting it drops the wrapper.
    expect(reassembleValue(segments, { '1': false })).toBe('<p>Keep</p>')
  })

  it('emits the <ul> when at least one child survives', () => {
    const segments = splitIntoSegments(
      '<ul><li>A</li></ul>',
      '<ul><li>A2</li><li>B</li></ul>',
      'markup',
    )!
    // Reject the second item (an insert) but keep the modified first.
    const result = reassembleValue(segments, { '0/1': false })
    expect(result).toBe('<ul><li>A2</li></ul>')
  })

  it('works in insertions-only translation mode', () => {
    // Reject one translated <li>; expect the source-language version restored.
    const segments = splitIntoSegments(
      '<p>Hallo</p><ul><li>Eins</li><li>Zwei</li></ul>',
      '<p>Bonjour</p><ul><li>Un</li><li>Deux</li></ul>',
      'markup',
    )!
    const result = reassembleValue(segments, { '1/1': false })
    expect(result).toBe('<p>Bonjour</p><ul><li>Un</li><li>Zwei</li></ul>')
  })
})

describe('flattenSegments', () => {
  it('includes list children at the same level as atomic siblings', () => {
    const segments = splitIntoSegments(
      '<p>A</p><ul><li>B</li><li>C</li></ul><p>D</p>',
      '<p>A2</p><ul><li>B2</li><li>C2</li></ul><p>D2</p>',
      'markup',
    )!
    const flat = flattenSegments(segments)
    expect(flat).toHaveLength(4)
    expect(flat.map((s) => s.id)).toEqual(['0', '1/0', '1/1', '2'])
  })
})
