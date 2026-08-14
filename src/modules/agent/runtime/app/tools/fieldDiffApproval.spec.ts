// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { splitIntoSegments } from '#blokkli/editor/helpers/diff'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import {
  decideFieldUpdates,
  rejectedWithoutReasonMessage,
} from './fieldDiffApproval'

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

/**
 * Fields whose changes shared a single highlight — because the field has no
 * editable element of its own — are decided in one click. The user never saw
 * the chunks as separate choices, so the result must not claim they judged
 * each one.
 */
describe('decideFieldUpdates with atomic items', () => {
  const before = '<p>Alt A</p><p>Alt B</p>'
  const after = '<p>Neu A</p><p>Neu B</p>'

  it('counts a merged field as one decision, not one per chunk', () => {
    const result = decideFieldUpdates([item(before, after)], {}, {}, {}, [1])
    expect(result.totalCount).toBe(1)
    expect(result.acceptedCount).toBe(1)
  })

  it('writes the proposed value verbatim when accepted', () => {
    // Not the reassembled value: that round-trips the field through the DOM
    // and rewrites content the user never touched.
    const result = decideFieldUpdates([item(before, after)], {}, {}, {}, [1])
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0]!.fieldValue).toBe(after)
  })

  it('reports a plain field rejection, with no invented per-chunk verdict', () => {
    // The decision is read off any chunk key — they move together.
    const result = decideFieldUpdates(
      [item(before, after)],
      { '1:0': false, '1:1': false },
      { '1:0': 'Zu werblich' },
      {},
      [1],
    )
    expect(result.updates).toHaveLength(0)
    const field = result.rejectedByUser['block-1']!.text!
    expect(field.reasonForRejection).toBe('Zu werblich')
    expect(field.partial).toBeUndefined()
  })

  // The same input without the flag: proves the flag is what changes the
  // shape, and documents what the merged case would otherwise report.
  it('still reports per-chunk detail when the item was NOT merged', () => {
    const result = decideFieldUpdates(
      [item(before, after)],
      { '1:0': false, '1:1': false },
      { '1:0': 'Zu werblich' },
      {},
      [],
    )
    expect(result.totalCount).toBe(2)
    const field = result.rejectedByUser['block-1']!.text!
    expect(field.partial?.accepted).toBe(0)
    expect(field.partial?.rejectedSegments).toHaveLength(2)
  })

  // The downstream consequence: a fabricated per-chunk verdict pushes enough
  // entries into the follow-up message to trip its "3 or more" branch, losing
  // the specific instruction for a single field.
  it('keeps the precise follow-up instruction when rejected without a reason', () => {
    const threeChunks = {
      ...item(
        '<p>Alt A</p><p>Alt B</p><p>Alt C</p>',
        '<p>Neu A</p><p>Neu B</p><p>Neu C</p>',
      ),
    }
    const selected = { '1:0': false, '1:1': false, '1:2': false }

    const merged = decideFieldUpdates([threeChunks], selected, {}, {}, [1])
    expect(rejectedWithoutReasonMessage(merged.rejectedByUser)).toContain(
      'ask_question',
    )
    expect(rejectedWithoutReasonMessage(merged.rejectedByUser)).toContain(
      '"text" of paragraph block-1',
    )

    const perChunk = decideFieldUpdates([threeChunks], selected, {}, {}, [])
    expect(rejectedWithoutReasonMessage(perChunk.rejectedByUser)).toBe(
      'Some changes were rejected without a reason. Ask the user what they would like to change instead.',
    )
  })

  it('leaves an unsegmented item alone even when listed as atomic', () => {
    const plain: ApprovalItem = {
      id: 2,
      uuid: 'block-2',
      fieldName: 'title',
      fieldLabel: 'Title',
      value: 'Neuer Titel',
    }
    const result = decideFieldUpdates([plain], {}, {}, {}, [2])
    expect(result.totalCount).toBe(1)
    expect(result.updates[0]!.fieldValue).toBe('Neuer Titel')
  })

  it('lets a manual edit win over the atomic flag', () => {
    // An edited item collapses to a whole-field unit keyed by item id, which
    // the edit branch handles before segmentation is considered at all.
    const result = decideFieldUpdates(
      [item(before, after)],
      {},
      {},
      { '1': 'Von Hand geschrieben' },
      [1],
    )
    expect(result.updates[0]!.fieldValue).toBe('Von Hand geschrieben')
    expect(result.editedFields).toHaveLength(1)
  })
})
