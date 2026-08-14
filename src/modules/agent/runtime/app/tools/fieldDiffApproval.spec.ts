// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { splitIntoSegments } from '#blokkli/editor/helpers/diff'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import { decideFieldUpdates } from './fieldDiffApproval'

function item(before: string, after: string): ApprovalItem {
  return {
    id: 1,
    uuid: 'block-1',
    fieldName: 'text',
    fieldLabel: 'Text',
    value: after,
    segments: splitIntoSegments(before, after, 'markup') ?? undefined,
  }
}

describe('decideFieldUpdates', () => {
  it('writes the proposed value verbatim when every segment is accepted', () => {
    // Reassembling is only needed for a genuine partial accept. Doing it when
    // everything was accepted pushes the whole field through the DOM and
    // rewrites content nobody touched — entities decode, `<br />` becomes
    // `<br>` — straight into the stored value.
    const before = '<p>Preis 10 &mdash; alt</p><p>Zeile A<br />Zeile B</p>'
    const after = '<p>Preis 10 &mdash; neu</p><p>Zeile A<br />Zeile B</p>'
    const result = decideFieldUpdates([item(before, after)], {}, {})
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0]!.fieldValue).toBe(after)
  })

  it('still reassembles when a segment is rejected', () => {
    const before = '<p>Alt A</p><p>Alt B</p>'
    const after = '<p>Neu A</p><p>Neu B</p>'
    const result = decideFieldUpdates(
      [item(before, after)],
      { '1:1': false },
      {},
    )
    expect(result.updates[0]!.fieldValue).toBe('<p>Neu A</p><p>Alt B</p>')
  })

  it('writes nothing when every segment is rejected', () => {
    const before = '<p>Alt A</p><p>Alt B</p>'
    const after = '<p>Neu A</p><p>Neu B</p>'
    const result = decideFieldUpdates(
      [item(before, after)],
      { '1:0': false, '1:1': false },
      {},
    )
    expect(result.updates).toHaveLength(0)
  })
})
