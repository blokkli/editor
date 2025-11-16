import { inject } from '#imports'
import { INJECT_EDIT_LOGGER } from '../symbols'
import type { DebugLogger } from '../providers/debug'

export default function (): DebugLogger {
  return inject<DebugLogger>(INJECT_EDIT_LOGGER) as DebugLogger
}
