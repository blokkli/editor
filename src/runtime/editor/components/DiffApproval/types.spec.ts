// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { splitIntoSegments } from '../../helpers/diff'
import {
  unitsFromItems,
  stopsFromUnits,
  type ApprovalItem,
  type ApprovalUnit,
} from './types'

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

const BLOCK_A = '4ce7b4f0-da66-4ae6-9378-c47eb7b7158e'
const BLOCK_B = '8b1f2c33-5d47-4a91-bc02-1e6a7f9d4c58'
const HOST = 'ff0a1b22-3c44-4d55-8e66-7f8899aabbcc'

/** A plain, unsegmented item — the shape both translation flows produce. */
function plainItem(id: number, uuid: string, fieldName: string): ApprovalItem {
  return {
    id,
    uuid,
    fieldName,
    fieldLabel: fieldName,
    value: `new ${fieldName}`,
  }
}

/** A segmented item with `count` changed top-level blocks. */
function segmentedItem(id: number, uuid: string, count: number): ApprovalItem {
  const before = Array.from(
    { length: count },
    (_, i) => `<p>Old ${i}</p>`,
  ).join('')
  const after = Array.from({ length: count }, (_, i) => `<p>New ${i}</p>`).join(
    '',
  )
  return {
    id,
    uuid,
    fieldName: 'text',
    fieldLabel: 'Text',
    value: after,
    segments: splitIntoSegments(before, after, 'markup') ?? undefined,
  }
}

function keysOf(units: ApprovalUnit[]): string[] {
  return units.map((u) => u.key)
}

describe('stopsFromUnits', () => {
  it('is 1:1 with units when every item has its own element', () => {
    const units = unitsFromItems([
      plainItem(0, BLOCK_A, 'title'),
      segmentedItem(1, BLOCK_B, 3),
    ])
    const stops = stopsFromUnits(
      units,
      new Map([
        [0, null],
        [1, null],
      ]),
    )

    expect(stops).toHaveLength(units.length)
    expect(stops.map((s) => s.key)).toEqual(keysOf(units))
    expect(stops.map((s) => s.kind)).toEqual(units.map((u) => u.kind))
  })

  // The reported bug: a card whose `title` carries the editable directive but
  // whose `text` is only prop-mapped. Both got their own rectangle, and the
  // text's — drawn on the whole card — swallowed every click on the title.
  it('gives an unanchored field its own group stop next to an anchored one', () => {
    const units = unitsFromItems([
      plainItem(0, BLOCK_A, 'title'),
      plainItem(1, BLOCK_A, 'text'),
    ])
    const stops = stopsFromUnits(
      units,
      new Map([
        [0, null],
        [1, `block:${BLOCK_A}`],
      ]),
    )

    expect(stops).toHaveLength(2)
    expect(stops[0]!.kind).toBe('whole')
    expect(stops[1]!.kind).toBe('group')
    expect(stops[1]!.key).toBe(`group:block:${BLOCK_A}`)
    expect(stops[1]!.units).toHaveLength(1)
  })

  // The spec's worst case: "a block with 5 fields, all have changes, none have
  // an editable element: you can just approve/reject all of them."
  it('merges five unanchored fields on one block into a single stop', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((name, i) =>
      plainItem(i, BLOCK_A, name),
    )
    const units = unitsFromItems(items)
    const stops = stopsFromUnits(
      units,
      new Map(items.map((item) => [item.id, `block:${BLOCK_A}`])),
    )

    expect(stops).toHaveLength(1)
    expect(stops[0]!.kind).toBe('group')
    expect(stops[0]!.units).toHaveLength(5)
    expect(stops[0]!.key).toBe(`group:block:${BLOCK_A}`)
  })

  // Without this, an unanchored *segmented* item drew one identical
  // block-sized rectangle per chunk, all stacked on the same spot.
  it('merges every chunk of an unanchored segmented field into one stop', () => {
    const units = unitsFromItems([segmentedItem(0, BLOCK_A, 5)])
    expect(units).toHaveLength(5)

    const stops = stopsFromUnits(units, new Map([[0, `block:${BLOCK_A}`]]))
    expect(stops).toHaveLength(1)
    expect(stops[0]!.kind).toBe('group')
    expect(stops[0]!.units).toHaveLength(5)
  })

  it('merges a segmented and an unsegmented field sharing a key, in reading order', () => {
    const units = unitsFromItems([
      segmentedItem(0, BLOCK_A, 2),
      plainItem(1, BLOCK_A, 'title'),
    ])
    const stops = stopsFromUnits(
      units,
      new Map([
        [0, `block:${BLOCK_A}`],
        [1, `block:${BLOCK_A}`],
      ]),
    )

    expect(stops).toHaveLength(1)
    expect(keysOf(stops[0]!.units)).toEqual(keysOf(units))
  })

  // Grouping keys on the resolved element, not the uuid: a host-entity field
  // and a block field with no findable block element both fall back to the
  // provider root, and keying on uuid would stack two identical rectangles.
  it('keeps distinct group keys in distinct stops', () => {
    const units = unitsFromItems([
      plainItem(0, BLOCK_A, 'text'),
      plainItem(1, HOST, 'summary'),
    ])
    const stops = stopsFromUnits(
      units,
      new Map([
        [0, `block:${BLOCK_A}`],
        [1, `host:${HOST}`],
      ]),
    )

    expect(stops).toHaveLength(2)
    expect(stops.map((s) => s.key)).toEqual([
      `group:block:${BLOCK_A}`,
      `group:host:${HOST}`,
    ])
  })

  // An empty stop would read as accepted (`[].every(...)` is true) and its
  // toggle would be a silent no-op, so it must never be created.
  it('creates no stop for an item with no changed segments', () => {
    const unchanged = segmentedItem(0, BLOCK_A, 2)
    unchanged.segments = splitIntoSegments(
      '<p>Same</p><p>Also same</p>',
      '<p>Same</p><p>Also same</p>',
      'markup',
    )!
    const units = unitsFromItems([unchanged])
    expect(units).toHaveLength(0)

    expect(stopsFromUnits(units, new Map([[0, `block:${BLOCK_A}`]]))).toEqual(
      [],
    )
  })

  it('treats an item missing from the map as anchored', () => {
    const units = unitsFromItems([plainItem(0, BLOCK_A, 'title')])
    const stops = stopsFromUnits(units, new Map())
    expect(stops).toHaveLength(1)
    expect(stops[0]!.kind).toBe('whole')
  })
})
