/**
 * Map of permission keys to their descriptions.
 *
 * Features can augment this interface to register additional permissions:
 *
 * ```ts
 * declare module '#blokkli/editor/types/permissions' {
 *   interface UserPermissionMap {
 *     my_permission: 'Description of what this permission grants.'
 *   }
 * }
 * ```
 */
export interface UserPermissionMap {
  use_blokkli: 'use the blökkli editor'
  list_users: 'list users that can be referenced in the editor (e.g. for @-mentions in comments)'
}

export type UserPermissions = keyof UserPermissionMap
