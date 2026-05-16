import { ref, computed, useAsyncData } from '#imports'
import type { Ref, ComputedRef } from '#imports'
import type { AdapterSearchArguments } from '#blokkli/editor/adapter'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

type PaginatedResult<T> = {
  filters: PluginConfigInput[]
  items: T[]
  total: number
  perPage: number
}

type QueryFn<T> = (args: AdapterSearchArguments) => Promise<PaginatedResult<T>>

export type AgentPaginatedQuery<T> = {
  page: Ref<number>
  items: ComputedRef<T[]>
  totalPages: ComputedRef<number>
  isLoading: ComputedRef<boolean>
  loadError: ComputedRef<string | null>
  refresh: () => Promise<void>
}

/**
 * Drives a paginated admin query (queryConversations, queryFeedback, …).
 * The adapter method may be absent on backends that don't support admin
 * listings — in that case `loadError` resolves to `missingMessage` and
 * `items` stays empty.
 */
export async function useAgentPaginatedQuery<T>(
  getQuery: () => QueryFn<T> | undefined,
  errors: { missing: string; failed: string },
): Promise<AgentPaginatedQuery<T>> {
  const page = ref(0)

  const { data, status, error, refresh } = await useAsyncData<
    PaginatedResult<T>
  >(
    () => {
      const query = getQuery()
      if (!query) throw new Error(errors.missing)
      return query({ page: page.value, filters: {} }).catch((e) => {
        console.warn('[blokkli agent] Paginated query failed:', e)
        throw new Error(errors.failed)
      })
    },
    {
      watch: [page],
      default: () => ({ items: [], filters: [], total: 0, perPage: 50 }),
    },
  )

  return {
    page,
    items: computed(() => data.value.items),
    totalPages: computed(() =>
      data.value.perPage > 0
        ? Math.max(1, Math.ceil(data.value.total / data.value.perPage))
        : 1,
    ),
    isLoading: computed(() => status.value === 'pending'),
    loadError: computed(() => error.value?.message ?? null),
    refresh: async () => {
      await refresh()
    },
  }
}
