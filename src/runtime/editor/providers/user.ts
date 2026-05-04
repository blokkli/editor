import type { BlokkliAdapter } from '#blokkli/editor/adapter'
import type { BlokkliUser } from '../types/user'

export type UserProvider = {
  /**
   * The user currently editing.
   */
  current: BlokkliUser

  /**
   * Whether the given user id matches the current user.
   */
  isCurrent: (id: string) => boolean

  /**
   * Load the list of users available in the editor (e.g. for @-mentions).
   * The first call invokes the adapter; subsequent calls return the cached
   * result. Adapters that don't implement getBlokkliUsers yield an empty
   * list. The cache is a plain (non-reactive) variable.
   */
  loadUsers: () => Promise<BlokkliUser[]>
}

export default async function (
  adapter: BlokkliAdapter<any>,
): Promise<UserProvider> {
  const current = await adapter.getCurrentUser()
  let usersPromise: Promise<BlokkliUser[]> | null = null
  return {
    current,
    isCurrent: (id: string) => id === current.id,
    loadUsers: () => {
      if (!usersPromise) {
        usersPromise = adapter.getBlokkliUsers
          ? adapter.getBlokkliUsers()
          : Promise.resolve([])
      }
      return usersPromise
    },
  }
}
