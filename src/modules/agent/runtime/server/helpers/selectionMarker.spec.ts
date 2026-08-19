import { describe, it, expect } from 'vitest'
import type { SelectedBlock } from '../../shared/types'
import { formatSelectionMarker } from './selectionMarker'

function block(bundle: string, uuid: string): SelectedBlock {
  return { uuid, bundle, label: bundle }
}

describe('formatSelectionMarker', () => {
  it('formats a single block', () => {
    expect(formatSelectionMarker([block('text', 'aaa')])).toBe(
      '[Editor selection when this message was sent: text (aaa)]',
    )
  })

  it('formats several blocks in order, comma separated', () => {
    const blocks = [
      block('text', 'aaa'),
      block('title', 'bbb'),
      block('image', 'ccc'),
    ]
    expect(formatSelectionMarker(blocks)).toBe(
      '[Editor selection when this message was sent: text (aaa), title (bbb), image (ccc)]',
    )
  })

  it('ignores the label — bundle and uuid identify the block', () => {
    const marker = formatSelectionMarker([
      { uuid: 'aaa', bundle: 'text', label: 'Fliesstext' },
    ])
    expect(marker).not.toContain('Fliesstext')
  })

  // The null cases carry meaning: no marker tells the LLM the selection was
  // empty, so these must never fall back to an empty-looking marker.
  it('returns null for an empty array', () => {
    expect(formatSelectionMarker([])).toBeNull()
  })

  it('returns null when omitted', () => {
    expect(formatSelectionMarker()).toBeNull()
  })
})
