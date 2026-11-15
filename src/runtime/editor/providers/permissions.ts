import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type {
  BlockPermission,
  BlockBundleDefinition,
} from '../types/definitions'
import type { RenderedFieldListItem } from '../types/field'
import type { UserPermissions } from '../types/permissions'
import type { EntityContext } from '#blokkli/types'
import type { BlocksProvider } from './blocks'
import type { DomProvider } from './dom'
import { useStateBasedCache } from '#blokkli/editor/composables'
import { itemEntityType } from '#blokkli-build/config'

export type PermissionsProvider = {
  hasPermission: (permission: UserPermissions) => boolean
  checkBlockBundlePermission: (
    bundle: string,
    operation: BlockPermission,
  ) => boolean
  filterDeniedBundles: (
    bundles: string[],
    operation: BlockPermission,
  ) => string[]

  /**
   * Check if a block has any ancestor that restricts editing.
   *
   * An ancestor restricts editing if its bundle lacks 'edit' permission, or
   * if the field holding it is read-only. All descendants are then
   * restricted too: the user cannot add, edit, or delete blocks inside it.
   */
  blockHasRestrictedAncestor: (uuid: string) => boolean

  /**
   * Get the outermost ancestor block that restricts editing.
   *
   * Walks up the parent chain and returns the UUID of the outermost ancestor
   * that restricts editing (see blockHasRestrictedAncestor), or undefined if
   * no ancestor does.
   */
  getRestrictedAncestor: (uuid: string) => string | undefined

  /**
   * Whether a paragraphs field is read-only: the user may not change what it
   * holds.
   */
  isFieldReadOnly: (
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ) => boolean

  /**
   * Whether blocks can be added to a field, moved into, out of or within it,
   * or removed from it.
   *
   * The field must not be read-only, its host must not place its blocks
   * itself (see isBlockPlacedByHost), and a block that holds it must be
   * editable (see canEditBlock).
   */
  canChangeField: (host: EntityContext, fieldName: string) => boolean

  /**
   * Whether the field holding a block can change: whether the block can be
   * removed, moved, duplicated, swapped or replaced, as far as its field
   * decides.
   *
   * Its content must be able to change (see canChangeBlockContent), and the
   * block that holds it must not place it itself. The bundle permissions of
   * the block are checked separately.
   */
  canChangeBlockField: (uuid: string) => boolean

  /**
   * Whether what a block holds can change, as far as its field decides: its
   * options, its texts, its fields.
   *
   * The field holding it must not be read-only, and no ancestor may restrict
   * editing. A block that its host places can't leave its place, but its
   * content can change. The bundle permissions are checked separately.
   */
  canChangeBlockContent: (uuid: string) => boolean

  /**
   * Whether the block holding a block's field places it itself, e.g. in its
   * own markup (the field's `hostPlacesBlocks`): the block stays where it is.
   */
  isBlockPlacedByHost: (uuid: string) => boolean

  /**
   * Whether a block can be edited: its options, its texts, its fields.
   *
   * The bundle must have 'edit' permission and the block's content must be
   * able to change (see canChangeBlockContent).
   */
  canEditBlock: (uuid: string) => boolean

  /**
   * Whether a text, reference or link field of a block or the page can be
   * changed.
   *
   * The field must not be read-only, and a block that holds it must be
   * editable.
   */
  canEditFieldValue: (host: EntityContext, fieldName: string) => boolean

  /**
   * The permissions the user has for a block: those of its bundle, or none
   * if its content can't change (see canChangeBlockContent).
   */
  getBlockPermissions: (uuid: string) => BlockPermission[]
}

function buildKey(
  entityType: string,
  entityBundle: string,
  fieldName: string,
): string {
  return entityType + ':' + entityBundle + ':' + fieldName
}

type FieldWithReadOnly = {
  entityType: string
  entityBundle: string
  name: string
  readOnly?: boolean
}

function getReadOnlyKeys(fields: FieldWithReadOnly[]): Set<string> {
  return new Set(
    fields
      .filter((v) => v.readOnly)
      .map((v) => buildKey(v.entityType, v.entityBundle, v.name)),
  )
}

export default async function (
  adapter: BlokkliAdapter<any>,
  blocks: BlocksProvider,
  dom: DomProvider,
): Promise<PermissionsProvider> {
  const getAncestorCache = useStateBasedCache(() => new Map<string, boolean>())
  const [
    permissionsArray,
    bundleDefinitions,
    fieldConfig,
    editableFieldConfig,
    droppableFieldConfig,
  ] = await Promise.all([
    adapter.getUserPermissions(),
    adapter.getAllBundles(),
    adapter.getFieldConfig(),
    adapter.getEditableFieldConfig?.() ?? [],
    adapter.getDroppableFieldConfig?.() ?? [],
  ])

  const bundleMap = bundleDefinitions.reduce<
    Record<string, BlockBundleDefinition>
  >((acc, def) => {
    acc[def.id] = def
    return acc
  }, {})

  const allPermissions: BlockPermission[] = ['add', 'delete', 'edit']

  // If every bundle has all 3 permissions, no permission checks can ever
  // fail — all methods can take a fast path.
  const allBundlesUnrestricted = bundleDefinitions.every((def) =>
    allPermissions.every((p) => def.permissions.includes(p)),
  )

  // The paragraphs fields that are read-only, and the text, reference and
  // link fields.
  const readOnlyFields = getReadOnlyKeys(fieldConfig)
  const readOnlyValueFields = getReadOnlyKeys([
    ...editableFieldConfig,
    ...droppableFieldConfig,
  ])

  // Without restricted bundles and read-only paragraphs fields, no block is
  // restricted by its ancestors or its field.
  const blocksUnrestricted = allBundlesUnrestricted && !readOnlyFields.size

  const bundlePermissionCache = new Map<string, boolean>()

  function hasPermission(permission: UserPermissions): boolean {
    return permissionsArray.includes(permission)
  }

  function checkBlockBundlePermission(
    bundle: string,
    operation: BlockPermission,
  ): boolean {
    if (allBundlesUnrestricted) {
      return true
    }
    const key = bundle + ':' + operation
    const cached = bundlePermissionCache.get(key)
    if (cached !== undefined) {
      return cached
    }
    const definition = bundleMap[bundle]
    let hasPermission = false
    if (definition) {
      hasPermission = definition.permissions.includes(operation)
    }
    bundlePermissionCache.set(key, hasPermission)
    return hasPermission
  }

  function filterDeniedBundles(
    bundles: string[],
    operation: BlockPermission,
  ): string[] {
    if (allBundlesUnrestricted) {
      return []
    }
    return bundles.filter(
      (bundle) => !checkBlockBundlePermission(bundle, operation),
    )
  }

  function isFieldReadOnly(
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ): boolean {
    return readOnlyFields.has(buildKey(entityType, entityBundle, fieldName))
  }

  /**
   * Whether a block restricts the blocks nested in it: its bundle can't be
   * edited, or the field holding it is read-only.
   */
  function restrictsDescendants(block: RenderedFieldListItem): boolean {
    return (
      !checkBlockBundlePermission(block.bundle, 'edit') ||
      isFieldReadOnly(block.host.type, block.host.bundle, block.host.fieldName)
    )
  }

  function blockHasRestrictedAncestor(uuid: string): boolean {
    if (blocksUnrestricted) {
      return false
    }
    const cache = getAncestorCache()
    const cached = cache.get(uuid)
    if (cached !== undefined) {
      return cached
    }

    let restricted = false
    const block = blocks.getBlock(uuid)
    if (block && block.host.type === itemEntityType) {
      const parent = blocks.getBlock(block.host.uuid)
      if (parent) {
        if (restrictsDescendants(parent)) {
          restricted = true
        } else {
          restricted = blockHasRestrictedAncestor(parent.uuid)
        }
      }
    }

    cache.set(uuid, restricted)
    return restricted
  }

  function getRestrictedAncestor(uuid: string): string | undefined {
    if (blocksUnrestricted) {
      return undefined
    }
    const block = blocks.getBlock(uuid)
    if (!block || block.host.type !== itemEntityType) {
      return undefined
    }

    const parent = blocks.getBlock(block.host.uuid)
    if (!parent) {
      return undefined
    }

    // Walk up first — the outermost restricted ancestor wins.
    const higherRestriction = getRestrictedAncestor(parent.uuid)
    if (higherRestriction) {
      return higherRestriction
    }

    if (restrictsDescendants(parent)) {
      return parent.uuid
    }

    return undefined
  }

  function hostPlacesBlocks(hostUuid: string, fieldName: string): boolean {
    return !!dom.getRegisteredField(hostUuid, fieldName)?.hostPlacesBlocks
  }

  function isBlockPlacedByHost(uuid: string): boolean {
    const block = blocks.getBlock(uuid)
    return !!block && hostPlacesBlocks(block.host.uuid, block.host.fieldName)
  }

  function canChangeBlockContent(uuid: string): boolean {
    const block = blocks.getBlock(uuid)
    if (!block) {
      return false
    }
    if (blocksUnrestricted) {
      return true
    }
    return (
      !isFieldReadOnly(
        block.host.type,
        block.host.bundle,
        block.host.fieldName,
      ) && !blockHasRestrictedAncestor(uuid)
    )
  }

  function canChangeBlockField(uuid: string): boolean {
    return canChangeBlockContent(uuid) && !isBlockPlacedByHost(uuid)
  }

  function canEditBlock(uuid: string): boolean {
    const block = blocks.getBlock(uuid)
    if (!block) {
      return false
    }
    return (
      checkBlockBundlePermission(block.bundle, 'edit') &&
      canChangeBlockContent(uuid)
    )
  }

  function canChangeField(host: EntityContext, fieldName: string): boolean {
    if (
      isFieldReadOnly(host.type, host.bundle, fieldName) ||
      hostPlacesBlocks(host.uuid, fieldName)
    ) {
      return false
    }
    // A field of the page.
    if (host.type !== itemEntityType) {
      return true
    }
    return canEditBlock(host.uuid)
  }

  function canEditFieldValue(host: EntityContext, fieldName: string): boolean {
    if (readOnlyValueFields.has(buildKey(host.type, host.bundle, fieldName))) {
      return false
    }
    // A field of the page.
    if (host.type !== itemEntityType) {
      return true
    }
    return canEditBlock(host.uuid)
  }

  function getBlockPermissions(uuid: string): BlockPermission[] {
    const block = blocks.getBlock(uuid)
    if (!block || !canChangeBlockContent(uuid)) {
      return []
    }
    if (allBundlesUnrestricted) {
      return allPermissions
    }
    return bundleMap[block.bundle]?.permissions ?? []
  }

  return {
    hasPermission,
    checkBlockBundlePermission,
    filterDeniedBundles,
    blockHasRestrictedAncestor,
    getRestrictedAncestor,
    isFieldReadOnly,
    canChangeField,
    canChangeBlockField,
    canChangeBlockContent,
    isBlockPlacedByHost,
    canEditBlock,
    canEditFieldValue,
    getBlockPermissions,
  }
}
