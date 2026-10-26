import { describe, expect, test } from 'vitest'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import type { DraggableItem } from '#blokkli/editor/types/draggable'
import {
  determineCanAddChildren,
  fitsNestingLimit,
  getDraggingBlockCount,
  getDraggingBundleGroups,
  getDraggingDepth,
} from './index'

function buildField(values: Partial<BlokkliFieldElement>): BlokkliFieldElement {
  return {
    cardinality: -1,
    allowedBundles: [],
    allowedFragments: [],
    ...values,
  } as BlokkliFieldElement
}

/**
 * Whether a new item with the bundles can be added to the field.
 */
function canAddNew(
  field: BlokkliFieldElement,
  bundles: string[],
  groups?: string[][],
  isBundlePermitted?: (bundle: string) => boolean,
): boolean {
  return determineCanAddChildren(
    field,
    [],
    [],
    0,
    1,
    bundles,
    [],
    isBundlePermitted,
    groups,
  )
}

function buildNativeDrop(values: Record<string, unknown>): DraggableItem {
  return {
    itemType: 'native_drop',
    itemBundles: [],
    ...values,
  } as unknown as DraggableItem
}

describe('determineCanAddChildren', () => {
  const field = buildField({ allowedBundles: ['image', 'document'] })

  test('a new item needs a bundle the field allows and the user may add', () => {
    expect(canAddNew(field, ['video', 'image'])).toBe(true)
    expect(canAddNew(field, ['video'])).toBe(false)
    expect(canAddNew(field, ['image'], undefined, () => false)).toBe(false)
  })

  test('a new item with bundle groups needs one in every group', () => {
    const groups = [['image', 'gallery'], ['document']]
    expect(canAddNew(field, groups.flat(), groups)).toBe(true)
    expect(
      canAddNew(
        buildField({ allowedBundles: ['image'] }),
        groups.flat(),
        groups,
      ),
    ).toBe(false)
    expect(
      canAddNew(
        field,
        groups.flat(),
        groups,
        (bundle) => bundle !== 'document',
      ),
    ).toBe(false)
  })

  test('one group is checked as the bundles are', () => {
    expect(canAddNew(field, ['video', 'image'], [['video', 'image']])).toBe(
      true,
    )
    expect(canAddNew(field, ['video'], [['video']])).toBe(false)
  })

  test('every block added counts for the cardinality', () => {
    const limited = buildField({ allowedBundles: ['image'], cardinality: 3 })
    const canAdd = (count: number) =>
      determineCanAddChildren(limited, [], [], 1, count, ['image'])
    expect(canAdd(2)).toBe(true)
    expect(canAdd(3)).toBe(false)
  })
})

describe('getDraggingBlockCount', () => {
  test('counts the blocks each item adds, one by default', () => {
    expect(
      getDraggingBlockCount([
        buildNativeDrop({ blockCount: 3 }),
        buildNativeDrop({}),
      ]),
    ).toBe(4)
  })
})

describe('getDraggingBundleGroups', () => {
  test('returns the groups of the items that have them', () => {
    expect(
      getDraggingBundleGroups([
        buildNativeDrop({ itemBundleGroups: [['image'], ['document']] }),
        buildNativeDrop({ itemBundles: ['text'] }),
      ]),
    ).toEqual([['image'], ['document']])
  })
})

describe('getDraggingDepth', () => {
  // A grid holds the inner grid, which holds a button. Another button is next
  // to the grid.
  const HOSTS: Record<string, string> = { inner: 'grid', deep: 'inner' }
  const LEVELS: Record<string, number> = {
    grid: 0,
    button: 0,
    inner: 1,
    deep: 2,
  }
  const isChildOf = (childUuid: string, parentUuid: string): boolean => {
    const host = HOSTS[childUuid]
    return !!host && (host === parentUuid || isChildOf(host, parentUuid))
  }
  const state = {
    getAllUuids: () => Object.keys(LEVELS),
    getNestingLevel: (uuid: string) => LEVELS[uuid] ?? 0,
    isChildOf,
  }

  test('new items and blocks without nested blocks take one level', () => {
    expect(getDraggingDepth([], state)).toBe(1)
    expect(getDraggingDepth(['button'], state)).toBe(1)
    expect(getDraggingDepth(['deep'], state)).toBe(1)
  })

  test('a block takes one more level for every level nested in it', () => {
    expect(getDraggingDepth(['inner'], state)).toBe(2)
    expect(getDraggingDepth(['grid'], state)).toBe(3)
    expect(getDraggingDepth(['button', 'grid'], state)).toBe(3)
  })
})

describe('fitsNestingLimit', () => {
  test('blocks fit down to the deepest level', () => {
    // The blocks in a field of the host entity are on level 1, so the ones
    // in a field on nesting level 6 are on level 7.
    expect(fitsNestingLimit(6, 1, 7)).toBe(true)
    expect(fitsNestingLimit(7, 1, 7)).toBe(false)
    // A block with nested blocks takes their levels too.
    expect(fitsNestingLimit(5, 2, 7)).toBe(true)
    expect(fitsNestingLimit(5, 3, 7)).toBe(false)
  })

  test('without a limit, blocks fit anywhere', () => {
    expect(fitsNestingLimit(100, 100, undefined)).toBe(true)
  })
})
