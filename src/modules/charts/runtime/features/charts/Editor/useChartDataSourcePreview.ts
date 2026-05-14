import { useAsyncData, useBlokkli } from '#imports'
import type { ComputedRef } from 'vue'
import type { ChartDataSourcePayload } from '../../../types'

export function useChartDataSourcePreview(
  sourceId: ComputedRef<string | undefined>,
) {
  const { adapter } = useBlokkli()

  const { data, status, error } = useAsyncData<ChartDataSourcePayload | null>(
    async () => {
      const id = sourceId.value
      if (!id) return null
      if (!adapter.getChartDataSourceData) return null
      return await adapter.getChartDataSourceData({ id })
    },
    {
      watch: [sourceId],
      default: () => null,
    },
  )

  return { payload: data, status, error }
}
