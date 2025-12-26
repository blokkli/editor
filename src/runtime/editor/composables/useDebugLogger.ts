import { inject } from '#imports'
import { INJECT_EDIT_LOGGER } from '../../helpers/injections'
import type { DebugLogger } from '../../helpers/providers/debug'

export function useDebugLogger(): DebugLogger {
  return inject(INJECT_EDIT_LOGGER) as DebugLogger
}
