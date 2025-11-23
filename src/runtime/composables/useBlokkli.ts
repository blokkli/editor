import { INJECT_APP } from '../helpers/symbols'
import { inject } from '#imports'
import type { BlokkliApp } from '#blokkli/types'

/**
 * Use the blokkli editor app.
 *
 * The app is only available when the editor is mounted. Calling this
 * composable in normal rendering does not work.
 *
 * @param optional - If true, returns undefined instead of throwing when not in edit mode
 * @returns The blokkli app, or undefined if optional is true and not in edit mode
 * @throws Error if not in edit mode and optional is false/undefined
 */
export function useBlokkli(optional: true): BlokkliApp | undefined
export function useBlokkli(optional?: false): BlokkliApp
export function useBlokkli(optional?: boolean): BlokkliApp | undefined {
  const app = inject<BlokkliApp | undefined>(INJECT_APP, undefined)
  if (!app) {
    if (optional) {
      return undefined
    }
    throw new Error(
      'The useBlokkli composable was called while not in edit mode.',
    )
  }

  return app
}
