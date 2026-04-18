import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type {
  BlockPermission,
  BlockBundleDefinition,
} from '../types/definitions'
import type { UserPermissions } from '../types/permissions'
import type { BlocksProvider } from './blocks'
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
   * Check if a block has any ancestor whose bundle lacks 'edit' permission.
   *
   * When an ancestor is restricted, all descendants are considered restricted
   * too — the user cannot add, edit, or delete blocks inside a restricted
   * parent.
   */
  blockHasRestrictedAncestor: (uuid: string) => boolean

  /**
   * Get the nearest ancestor block that restricts editing.
   *
   * Walks up the parent chain and returns the UUID of the first ancestor
   * whose bundle lacks 'edit' permission, or undefined if no ancestor is
   * restricted.
   */
  getRestrictedAncestor: (uuid: string) => string | undefined

  getBlockBundlePermissions: (bundle: string) => BlockPermission[]
}

export default async function (
  adapter: BlokkliAdapter<any>,
  blocks: BlocksProvider,
): Promise<PermissionsProvider> {
  const getAncestorCache = useStateBasedCache(() => new Map<string, boolean>())
  const [permissionsArray, bundleDefinitions] = await Promise.all([
    adapter.getUserPermissions(),
    adapter.getAllBundles(),
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

  function blockHasRestrictedAncestor(uuid: string): boolean {
    if (allBundlesUnrestricted) {
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
        if (!checkBlockBundlePermission(parent.bundle, 'edit')) {
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
    if (allBundlesUnrestricted) {
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

    // Walk up first — the deepest restricted ancestor wins.
    const higherRestriction = getRestrictedAncestor(parent.uuid)
    if (higherRestriction) {
      return higherRestriction
    }

    if (!checkBlockBundlePermission(parent.bundle, 'edit')) {
      return parent.uuid
    }

    return undefined
  }

  function getBlockBundlePermissions(bundle: string): BlockPermission[] {
    if (allBundlesUnrestricted) {
      return allPermissions
    }
    return bundleDefinitions.find((v) => v.id === bundle)?.permissions ?? []
  }

  return {
    hasPermission,
    checkBlockBundlePermission,
    filterDeniedBundles,
    blockHasRestrictedAncestor,
    getRestrictedAncestor,
    getBlockBundlePermissions,
  }
}
