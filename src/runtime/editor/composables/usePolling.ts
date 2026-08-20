import { onMounted, onUnmounted, toValue } from '#imports'
import type { MaybeRefOrGetter } from 'vue'

/** Default poll interval for refreshing remote data. */
const DEFAULT_INTERVAL = 60_000

export type UsePollingOptions = {
  /**
   * Fetches the fresh data and applies it.
   *
   * Rejections are swallowed: a failed poll keeps the last known value and the
   * next tick simply tries again.
   */
  handler: () => Promise<void>

  /** Poll interval in milliseconds. Defaults to 60s. */
  interval?: number

  /**
   * While `true` no polling happens.
   *
   * Use it when something else owns the data for a while, e.g. an open
   * dropdown that refetches after every interaction — a poll would only add a
   * redundant request that could clobber the fresher value with a stale one.
   */
  pause?: MaybeRefOrGetter<boolean>

  /**
   * Run the handler once on mount.
   *
   * Leave it off when the data has already been loaded during setup.
   */
  immediate?: boolean
}

/**
 * Periodically refresh remote data.
 *
 * In addition to the interval, the data is also refreshed when the tab is
 * focused again, but only if the last refresh is older than the interval —
 * quick tab-flipping must not trigger a request storm. Nothing is fetched
 * while the tab is hidden.
 *
 * @example
 * usePolling({
 *   immediate: true,
 *   pause: isDropdownOpen,
 *   handler: async () => {
 *     count.value = await adapter.loadUnreadNotificationsCount()
 *   },
 * })
 */
export function usePolling(options: UsePollingOptions) {
  const interval = options.interval ?? DEFAULT_INTERVAL

  let lastRefreshAt = 0
  let isRefreshing = false
  let timer: ReturnType<typeof setInterval> | null = null

  /** Refresh immediately, regardless of when the last refresh happened. */
  const refresh = async (): Promise<void> => {
    if (isRefreshing) {
      return
    }
    isRefreshing = true
    try {
      await options.handler()
      lastRefreshAt = Date.now()
    } catch {
      // Swallowed on purpose: keep the last known value and retry later.
    } finally {
      isRefreshing = false
    }
  }

  /** Refresh only if the last one is older than the interval. */
  const maybeRefresh = () => {
    if (document.hidden || toValue(options.pause)) {
      return
    }
    if (Date.now() - lastRefreshAt < interval) {
      return
    }
    refresh()
  }

  onMounted(async () => {
    if (options.immediate) {
      await refresh()
    } else {
      // The data was loaded during setup, so the first tick is a full
      // interval away.
      lastRefreshAt = Date.now()
    }

    timer = setInterval(maybeRefresh, interval)
    document.addEventListener('visibilitychange', maybeRefresh)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
    document.removeEventListener('visibilitychange', maybeRefresh)
  })

  return { refresh }
}
