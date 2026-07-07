// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { splitIntoSegments } from '../../helpers/diff'
import { unitsFromItems, type ApprovalItem } from './types'

function makeItem(before: string, after: string): ApprovalItem {
  return {
    id: 0,
    uuid: '4ce7b4f0-da66-4ae6-9378-c47eb7b7158e',
    fieldName: 'text',
    fieldLabel: 'Text',
    value: after,
    segments: splitIntoSegments(before, after, 'markup') ?? undefined,
  }
}

describe('unitsFromItems', () => {
  it('emits a unit for an unsegmented item', () => {
    const item: ApprovalItem = {
      id: 0,
      uuid: 'uuid',
      fieldName: 'text',
      fieldLabel: 'Text',
      value: 'New',
    }
    expect(unitsFromItems([item])).toHaveLength(1)
  })

  it('emits only units for changed segments', () => {
    const item = makeItem(
      '<p>Same</p><p>Old</p>',
      '<p>Same</p><p>New</p>',
      // The unchanged first <p> is context, not a choice.
    )
    const units = unitsFromItems([item])
    expect(units).toHaveLength(1)
    expect(units[0]!.kind).toBe('segment')
  })

  // Repro for the reported bug: the agent proposed a value whose only
  // difference to the current field value is an added style attribute on the
  // <p>. The values differ, so update_text_fields keeps the item and mounts
  // DiffApproval — but no unit is produced for it, `currentUnit` stays null
  // and the approval toolbar never renders, leaving the tool call stuck.
  it('emits a unit when the only change is an attribute on a matched block', () => {
    const item = makeItem(
      '<p>Search for blocks, existing content or media in your CMS or DAM and place them right away as blocks on your page.&nbsp;<br>&nbsp;</p>',
      '<p style="background-color: red;">Search for blocks, existing content or media in your CMS or DAM and place them right away as blocks on your page.&nbsp;<br>&nbsp;</p>',
    )
    // The proposed value is a real change, so the user must get an
    // accept/reject unit for it.
    expect(unitsFromItems([item])).toHaveLength(1)
  })
})
