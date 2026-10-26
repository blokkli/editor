import { describe, it, expect } from 'vitest'
import type { RenderedFieldListItem } from '../types/field'
import { getSwapDisabledReason } from './swap'

// The page holds a grid and a button. The grid holds the inner grid, which
// holds a button. Every field takes grids and buttons.
const HOSTS: Record<string, string> = {
  grid: 'page',
  button: 'page',
  inner: 'grid',
  deep: 'inner',
}

function block(uuid: string, bundle: string): RenderedFieldListItem {
  const hostUuid = HOSTS[uuid]!
  return {
    uuid,
    bundle,
    isNew: false,
    isPublished: true,
    host:
      hostUuid === 'page'
        ? {
            type: 'node',
            uuid: hostUuid,
            fieldName: 'field_content',
            bundle: 'page',
          }
        : {
            type: 'paragraph',
            uuid: hostUuid,
            fieldName: 'field_items',
            bundle: 'grid',
          },
    fieldListType: 'default',
    parentBlockBundle: null,
    library: null,
    fragment: null,
    isNested: hostUuid !== 'page',
    outdatedTranslations: [],
  }
}

function isChildOf(childUuid: string, parentUuid: string): boolean {
  const host = HOSTS[childUuid]
  return !!host && (host === parentUuid || isChildOf(host, parentUuid))
}

const ctx = {
  getFieldConfig: (
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ) => ({
    name: fieldName,
    entityType,
    entityBundle,
    label: fieldName,
    cardinality: -1,
    canEdit: true,
    allowedBundles: ['grid', 'button'],
  }),
  checkBlockBundlePermission: () => true,
  blockHasRestrictedAncestor: () => false,
  isChildOf,
}

describe('getSwapDisabledReason', () => {
  it('swaps blocks that are not nested in each other', () => {
    expect(
      getSwapDisabledReason(
        block('inner', 'grid'),
        block('button', 'button'),
        ctx,
      ),
    ).toBeNull()
  })

  it('does not swap a block with one nested in it, in either order', () => {
    const grid = block('grid', 'grid')
    for (const nested of [block('inner', 'grid'), block('deep', 'button')]) {
      expect(getSwapDisabledReason(grid, nested, ctx)).toBe(
        'Cannot swap a block with a block nested in it.',
      )
      expect(getSwapDisabledReason(nested, grid, ctx)).toBe(
        'Cannot swap a block with a block nested in it.',
      )
    }
  })
})
