import { onBlokkliEvent } from './onBlokkliEvent'

/**
 * Caches the result of the given callback for the duration of the current state.
 */
export function useStateBasedCache<T>(cb: () => T): () => T {
  let cached: T | null = null

  onBlokkliEvent('state:reloaded', () => {
    cached = null
  })

  return () => {
    if (!cached) {
      cached = cb()
    }

    return cached
  }
}
