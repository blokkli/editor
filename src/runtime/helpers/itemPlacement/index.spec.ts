import { describe, expect, test, vi } from 'vitest'
import { getItemPlacement, type FieldPlacement } from './index'

function field(parentType: string, uuids: string[]): FieldPlacement {
  return { parentType, getUuids: vi.fn(() => uuids) }
}

describe('getItemPlacement', () => {
  test('a block of the field gets its index and the type of the block holding the field', () => {
    expect(
      getItemPlacement({ uuid: 'b' }, field('slider', ['a', 'b', 'c'])),
    ).toEqual({ index: 1, parentType: 'slider' })
  })

  test('what a <BlokkliItem> is given counts, without looking at the field', () => {
    const slider = field('slider', ['a', 'b'])
    expect(
      getItemPlacement({ uuid: 'b', index: 4, parentType: 'grid' }, slider),
    ).toEqual({ index: 4, parentType: 'grid' })
    expect(slider.getUuids).not.toHaveBeenCalled()
  })

  test('an empty parent type given counts: the block renders at the top', () => {
    expect(
      getItemPlacement({ uuid: 'b', parentType: '' }, field('slider', ['b'])),
    ).toEqual({ index: 0, parentType: '' })
  })

  test('given only the index, the parent type comes from the field', () => {
    expect(
      getItemPlacement({ uuid: 'b', index: 7 }, field('slider', ['a', 'b'])),
    ).toEqual({ index: 7, parentType: 'slider' })
  })

  test("a block that isn't the field's renders at the top, as before", () => {
    // Such as the block of a library item, inside the field's block.
    expect(
      getItemPlacement({ uuid: 'x' }, field('slider', ['a', 'b'])),
    ).toEqual({ index: 0, parentType: '' })
  })

  test('outside a field, the block renders at the top', () => {
    expect(getItemPlacement({ uuid: 'a' }, null)).toEqual({
      index: 0,
      parentType: '',
    })
  })

  test('a block of a field of the page has no parent type', () => {
    expect(getItemPlacement({ uuid: 'b' }, field('', ['a', 'b']))).toEqual({
      index: 1,
      parentType: '',
    })
  })
})
