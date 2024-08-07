import { INJECT_APP } from '../helpers/symbols'
import { inject } from '#imports'
import type { BlokkliApp } from '#blokkli/types'

/**
 * Use the blokkli editor app.
 *
 * The app is only available when the editor is mounted. Calling this
 * composable in normal rendering does not work.
 */
export function useBlokkli(): BlokkliApp {
  return inject(INJECT_APP) as BlokkliApp
}
