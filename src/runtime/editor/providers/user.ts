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
}

export default async function (
  adapter: BlokkliAdapter<any>,
): Promise<UserProvider> {
  const current = await adapter.getCurrentUser()
  return {
    current,
    isCurrent: (id: string) => id === current.id,
  }
}
