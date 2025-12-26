import { inject } from '#imports'
import { INJECT_EDIT_LOGGER } from '../../helpers/injections'
import type { DebugLogger } from '#blokkli/editor/providers/debug'

export function useDebugLogger(): DebugLogger {
  return inject(INJECT_EDIT_LOGGER) as DebugLogger
}
