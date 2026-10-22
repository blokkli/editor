// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { marked } from 'marked'
import { markedOptions, renderMarkdown } from './markdown'
import { linkifyBlockUuids } from './linkifyBlockUuids'

const UUID = 'aaaaaaaa-1111-2222-3333-444444444444'

describe('renderMarkdown', () => {
  it('keeps what markdown renders, except images', () => {
    const markdown = [
      '# Title',
      '',
      'Text **b** _i_ ~~s~~ `c` [link](https://example.com/ "t")',
      '',
      '- [x] done',
      '- [ ] open',
      '',
      '3. three',
      '',
      '> quote',
      '',
      '```js',
      'x',
      '```',
      '',
      '| a | b |',
      '|:--|--:|',
      '| 1 | 2 |',
      '',
      '---',
    ].join('\n')
    expect(renderMarkdown(markdown)).toBe(
      marked.parse(markdown, markedOptions) as string,
    )
    expect(renderMarkdown('A ![x](https://example.com/x.png)')).toBe(
      '<p>A </p>\n',
    )
  })

  it('keeps the block chips', () => {
    const content = linkifyBlockUuids(
      `See ${UUID} and ${UUID.replace('a', 'b')}.`,
      (uuid) => (uuid === UUID ? 'Text' : null),
      'deleted',
    )
    expect(renderMarkdown(content)).toBe(
      `<p>See <a class="bk-agent-block-ref" href="#${UUID}">Text</a> and <span class="bk-agent-block-ref-deleted">[deleted]</span>.</p>\n`,
    )
  })

  it('removes other markup, keeping its text', () => {
    expect(renderMarkdown('<div data-id="1"><section>A</section></div>')).toBe(
      'A',
    )
  })
})
