import type { BlokkliAdapterSearchResults } from '#blokkli/editor/adapter'
import type {
  ChartDataSource,
  ChartDataSourceCapabilities,
  ChartDataSourcePayload,
} from '../types'

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    /**
     * Return the capabilities of the chart data sources system. If this
     * method is implemented, the chart editor enables the "Dynamic Data"
     * tab in the Data panel.
     *
     * Reserved for future flags (realtime updates, filtering, etc.).
     */
    getChartDataSourceCapabilities?: () =>
      | Promise<ChartDataSourceCapabilities>
      | ChartDataSourceCapabilities

    /**
     * Return the list of available chart data sources.
     *
     * - When capabilities.supportsSearch is `false`: called once with no
     *   args, expected to return the full list as `ChartDataSource[]`.
     *   The editor performs fuzzy filtering client-side.
     * - When `true`: called with `text` + `page`, expected to return
     *   `BlokkliAdapterSearchResults<ChartDataSource>` for backend search +
     *   pagination.
     */
    getChartDataSources?: (args: {
      text?: string
      page?: number
    }) => Promise<
      ChartDataSource[] | BlokkliAdapterSearchResults<ChartDataSource>
    >

    /**
     * Fetch the actual data for a source ID. Used by the chart editor for
     * preview rendering only. The runtime is not aware of the adapter and
     * uses its own fetching mechanism (passed via the `dynamicData` prop
     * on `ChartRenderer`).
     */
    getChartDataSourceData?: (args: {
      id: string
    }) => Promise<ChartDataSourcePayload>
  }
}

export {}
