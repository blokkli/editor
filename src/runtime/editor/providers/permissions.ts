import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type { UserPermissions } from '../types/permissions'

export type PermissionsProvider = {
  hasPermission: (permission: UserPermissions) => boolean
}

export default async function (
  adapter: BlokkliAdapter<any>,
): Promise<PermissionsProvider> {
  const permissionsArray = await adapter.getUserPermissions()

  function hasPermission(permission: UserPermissions): boolean {
    return permissionsArray.includes(permission)
  }

  return {
    hasPermission,
  }
}
