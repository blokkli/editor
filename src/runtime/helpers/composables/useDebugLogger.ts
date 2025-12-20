import { inject } from '#imports'
import { INJECT_EDIT_LOGGER } from '../injections'
import type { DebugLogger } from '../providers/debug'

export default function (): DebugLogger {
  return inject(INJECT_EDIT_LOGGER) as DebugLogger
}
