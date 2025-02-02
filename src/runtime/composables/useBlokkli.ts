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
  const app = inject<BlokkliApp>(INJECT_APP)
  if (!app) {
    throw new Error(
      'The useBlokkli composable was called while not in edit mode.',
    )
  }

  return app
}
