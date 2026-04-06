export type CacheProvider = {
  /**
   * Get a cached value by key, or create it using the factory.
   */
  get: <T>(key: string, factory: () => T) => T

  /**
   * Get a cached value by key, or create it using an async factory.
   *
   * The promise is cached, so concurrent calls with the same key
   * share the same in-flight promise. Rejected promises are evicted
   * so the next call retries.
   */
  getAsync: <T>(key: string, factory: () => Promise<T>) => Promise<T>

  /**
   * Remove a cached entry so the next get/getAsync call recreates it.
   */
  invalidate: (key: string) => void

  /**
   * Remove all cached entries.
   */
  invalidateAll: () => void
}

export default function (): CacheProvider {
  const store = new Map<string, unknown>()

  function get<T>(key: string, factory: () => T): T {
    if (store.has(key)) {
      return store.get(key) as T
    }
    const value = factory()
    store.set(key, value)
    return value
  }

  function getAsync<T>(key: string, factory: () => Promise<T>): Promise<T> {
    if (store.has(key)) {
      return store.get(key) as Promise<T>
    }
    const promise = factory()
    store.set(key, promise)
    promise.catch(() => {
      store.delete(key)
    })
    return promise
  }

  function invalidate(key: string): void {
    store.delete(key)
  }

  function invalidateAll(): void {
    store.clear()
  }

  return { get, getAsync, invalidate, invalidateAll }
}
