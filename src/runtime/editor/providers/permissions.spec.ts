import { describe, it, expect } from 'vitest'
import { itemEntityType } from '#blokkli-build/config'
import type { BlockPermission } from '../types/definitions'
import type { RenderedFieldListItem } from '../types/field'
import permissionsProvider from './permissions'

// The page holds a grid in its aside and the columns in its paragraphs. The
// aside's grid holds a text, the columns hold a text on the left and a grid on
// the right, which holds a text.
const TREE: Record<string, { host: string; field: string; bundle: string }> = {
  aside: { host: 'page', field: 'field_aside', bundle: 'grid' },
  asideText: { host: 'aside', field: 'field_items', bundle: 'text' },
  columns: { host: 'page', field: 'field_paragraphs', bundle: 'columns' },
  left: { host: 'columns', field: 'field_left', bundle: 'text' },
  right: { host: 'columns', field: 'field_right', bundle: 'grid' },
  rightText: { host: 'right', field: 'field_items', bundle: 'text' },
}

const PAGE = { type: 'node', bundle: 'page', uuid: 'page' }

function block(uuid: string): RenderedFieldListItem | undefined {
  const item = TREE[uuid]
  if (!item) {
    return undefined
  }
  const host =
    item.host === 'page'
      ? { type: 'node', uuid: 'page', bundle: 'page' }
      : {
          type: itemEntityType,
          uuid: item.host,
          bundle: TREE[item.host]!.bundle,
        }
  return {
    uuid,
    bundle: item.bundle,
    isNew: false,
    isPublished: true,
    host: { ...host, fieldName: item.field },
    fieldListType: 'default',
    parentBlockBundle: null,
    library: null,
    fragment: null,
    isNested: item.host !== 'page',
    outdatedTranslations: [],
  }
}

function hostOf(uuid: string) {
  return { type: itemEntityType, bundle: TREE[uuid]!.bundle, uuid }
}

function field(
  entityType: string,
  entityBundle: string,
  name: string,
  readOnly?: boolean,
) {
  return { name, entityType, entityBundle, readOnly }
}

/**
 * Builds the provider. By default, the aside and the right column are
 * read-only, as are a text's title and its media.
 */
function createProvider(
  options: {
    readOnly?: boolean
    permissions?: Record<string, BlockPermission[]>
  } = {},
) {
  const readOnly = options.readOnly ?? true
  const all: BlockPermission[] = ['add', 'delete', 'edit']
  const bundles = ['grid', 'text', 'columns'].map((id) => ({
    id,
    label: id,
    permissions: options.permissions?.[id] ?? all,
  }))
  const fieldConfig = [
    field('node', 'page', 'field_aside', readOnly),
    field('node', 'page', 'field_paragraphs'),
    field(itemEntityType, 'columns', 'field_left'),
    field(itemEntityType, 'columns', 'field_right', readOnly),
    field(itemEntityType, 'grid', 'field_items'),
  ].map((v) => ({
    ...v,
    label: v.name,
    cardinality: -1,
    canEdit: true,
    allowedBundles: [],
  }))
  const adapter = {
    getUserPermissions: () => Promise.resolve([]),
    getAllBundles: () => Promise.resolve(bundles),
    getFieldConfig: () => Promise.resolve(fieldConfig),
    getEditableFieldConfig: () =>
      Promise.resolve([
        field(itemEntityType, 'text', 'field_title', readOnly),
        field(itemEntityType, 'text', 'field_lead'),
        field('node', 'page', 'title', readOnly),
      ]),
    getDroppableFieldConfig: () =>
      Promise.resolve([field(itemEntityType, 'text', 'field_media', readOnly)]),
  }
  return permissionsProvider(adapter as never, { getBlock: block } as never)
}

describe('read-only paragraphs fields', () => {
  it('restrict the blocks in them, which stay selectable', async () => {
    const permissions = await createProvider()
    for (const uuid of ['aside', 'right']) {
      expect(permissions.getRestrictedAncestor(uuid)).toBeUndefined()
      expect(permissions.canChangeBlockField(uuid)).toBe(false)
      expect(permissions.canEditBlock(uuid)).toBe(false)
      expect(permissions.getBlockPermissions(uuid)).toEqual([])
    }
  })

  it('select the block in them instead of a block nested in it', async () => {
    const permissions = await createProvider()
    expect(permissions.getRestrictedAncestor('asideText')).toBe('aside')
    expect(permissions.getRestrictedAncestor('rightText')).toBe('right')
    expect(permissions.blockHasRestrictedAncestor('rightText')).toBe(true)
    expect(permissions.canEditBlock('rightText')).toBe(false)
  })

  it('leave the block holding them and its other fields alone', async () => {
    const permissions = await createProvider()
    expect(permissions.canEditBlock('columns')).toBe(true)
    expect(permissions.canChangeBlockField('columns')).toBe(true)
    expect(permissions.canEditBlock('left')).toBe(true)
    expect(permissions.getRestrictedAncestor('left')).toBeUndefined()
    expect(permissions.getBlockPermissions('columns')).toEqual([
      'add',
      'delete',
      'edit',
    ])
  })

  it('take no blocks, nor do the fields nested in them', async () => {
    const permissions = await createProvider()
    expect(permissions.canChangeField(PAGE, 'field_aside')).toBe(false)
    expect(permissions.canChangeField(PAGE, 'field_paragraphs')).toBe(true)
    expect(permissions.canChangeField(hostOf('columns'), 'field_right')).toBe(
      false,
    )
    expect(permissions.canChangeField(hostOf('columns'), 'field_left')).toBe(
      true,
    )
    expect(permissions.canChangeField(hostOf('aside'), 'field_items')).toBe(
      false,
    )
    expect(permissions.canChangeField(hostOf('right'), 'field_items')).toBe(
      false,
    )
  })

  it('apply when every bundle may be edited', async () => {
    const permissions = await createProvider()
    expect(permissions.isFieldReadOnly('node', 'page', 'field_aside')).toBe(
      true,
    )
    expect(permissions.blockHasRestrictedAncestor('asideText')).toBe(true)
  })

  it('restrict nothing when there are none', async () => {
    const permissions = await createProvider({ readOnly: false })
    for (const uuid of Object.keys(TREE)) {
      expect(permissions.getRestrictedAncestor(uuid)).toBeUndefined()
      expect(permissions.canEditBlock(uuid)).toBe(true)
    }
    expect(permissions.canChangeField(PAGE, 'field_aside')).toBe(true)
  })
})

describe('a bundle without edit permission', () => {
  it('restricts the blocks nested in it, as before', async () => {
    const permissions = await createProvider({
      readOnly: false,
      permissions: { columns: ['add', 'delete'] },
    })
    expect(permissions.getRestrictedAncestor('rightText')).toBe('columns')
    expect(permissions.canEditBlock('columns')).toBe(false)
    // Its field can still change: it can be moved or removed.
    expect(permissions.canChangeBlockField('columns')).toBe(true)
    expect(permissions.canChangeField(hostOf('columns'), 'field_left')).toBe(
      false,
    )
    expect(permissions.getBlockPermissions('columns')).toEqual([
      'add',
      'delete',
    ])
  })
})

describe('read-only text and reference fields', () => {
  it('can not be changed', async () => {
    const permissions = await createProvider()
    expect(permissions.canEditFieldValue(hostOf('left'), 'field_title')).toBe(
      false,
    )
    expect(permissions.canEditFieldValue(hostOf('left'), 'field_media')).toBe(
      false,
    )
    expect(permissions.canEditFieldValue(hostOf('left'), 'field_lead')).toBe(
      true,
    )
    expect(permissions.canEditFieldValue(PAGE, 'title')).toBe(false)
  })

  it('include the fields of a block that can not be edited', async () => {
    const permissions = await createProvider()
    expect(
      permissions.canEditFieldValue(hostOf('rightText'), 'field_lead'),
    ).toBe(false)
    expect(permissions.canEditFieldValue(hostOf('aside'), 'field_lead')).toBe(
      false,
    )
  })
})
