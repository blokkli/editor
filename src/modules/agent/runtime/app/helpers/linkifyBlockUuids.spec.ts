import { describe, it, expect, vi } from 'vitest'
import { linkifyBlockUuids } from './linkifyBlockUuids'

const UUID_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const UUID_B = 'bbbbbbbb-5555-6666-7777-888888888888'
const UUID_UNKNOWN = 'cccccccc-9999-aaaa-bbbb-cccccccccccc'
const DELETED = 'deleted'

const labels: Record<string, string> = {
  [UUID_A]: 'Text Block',
  [UUID_B]: 'Image Card',
}

function resolver(uuid: string): string | null {
  return labels[uuid] ?? null
}

describe('linkifyBlockUuids', () => {
  it('renders a known UUID as a styled <a> with the bundle label', () => {
    expect(linkifyBlockUuids(`See ${UUID_A} please.`, resolver, DELETED)).toBe(
      `See <a class="bk-agent-block-ref" href="#${UUID_A}">Text Block</a> please.`,
    )
  })

  it('renders an unknown UUID as a styled span placeholder', () => {
    expect(
      linkifyBlockUuids(`See ${UUID_UNKNOWN} please.`, resolver, DELETED),
    ).toBe(
      `See <span class="bk-agent-block-ref-deleted">[deleted]</span> please.`,
    )
  })

  it('uses the provided deletedLabel verbatim inside the span', () => {
    expect(linkifyBlockUuids(UUID_UNKNOWN, resolver, 'gelöscht')).toBe(
      '<span class="bk-agent-block-ref-deleted">[gelöscht]</span>',
    )
  })

  it('replaces multiple UUIDs independently and calls the resolver per match', () => {
    const spy = vi.fn(resolver)
    const out = linkifyBlockUuids(`${UUID_A} and ${UUID_B}`, spy, DELETED)
    expect(out).toBe(
      `<a class="bk-agent-block-ref" href="#${UUID_A}">Text Block</a> and <a class="bk-agent-block-ref" href="#${UUID_B}">Image Card</a>`,
    )
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not double-wrap a UUID already inside an existing markdown link', () => {
    const input = `Edit [the intro](#${UUID_A}) now.`
    expect(linkifyBlockUuids(input, resolver, DELETED)).toBe(input)
  })

  it('does not touch UUIDs inside a fenced code block', () => {
    const input = '```\n' + UUID_A + '\n```'
    expect(linkifyBlockUuids(input, resolver, DELETED)).toBe(input)
  })

  it('does not touch UUIDs inside an inline code span', () => {
    const input = 'literal `' + UUID_A + '` here'
    expect(linkifyBlockUuids(input, resolver, DELETED)).toBe(input)
  })

  it('does not match a UUID-shaped substring inside a larger token', () => {
    const longer = `${UUID_A}-extra`
    const prefixed = `prefix-${UUID_A}`
    expect(linkifyBlockUuids(longer, resolver, DELETED)).toBe(longer)
    expect(linkifyBlockUuids(prefixed, resolver, DELETED)).toBe(prefixed)
  })

  it('HTML-escapes the bundle label so it cannot inject markup', () => {
    const tricky = (uuid: string): string | null =>
      uuid === UUID_A ? '<b>Heading</b> & "v2"' : null
    expect(linkifyBlockUuids(UUID_A, tricky, DELETED)).toBe(
      `<a class="bk-agent-block-ref" href="#${UUID_A}">&lt;b&gt;Heading&lt;/b&gt; &amp; &quot;v2&quot;</a>`,
    )
  })

  it('HTML-escapes the deleted label so it cannot inject markup', () => {
    expect(linkifyBlockUuids(UUID_UNKNOWN, resolver, '<script>&"\'evil')).toBe(
      '<span class="bk-agent-block-ref-deleted">[&lt;script&gt;&amp;&quot;&#39;evil]</span>',
    )
  })

  it('returns input unchanged when there are no UUIDs', () => {
    expect(linkifyBlockUuids('Just some prose.', resolver, DELETED)).toBe(
      'Just some prose.',
    )
  })

  it('returns empty input unchanged', () => {
    expect(linkifyBlockUuids('', resolver, DELETED)).toBe('')
  })
})
