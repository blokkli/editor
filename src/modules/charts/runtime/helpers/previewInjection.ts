import type { ComputedRef, InjectionKey } from 'vue'
import type { ChartDataSourcePayload } from '../types'

/**
 * Editor-only injection used by the chart editor's `Preview` component to
 * pass the adapter-fetched dynamic data into the chart block (which renders
 * `ChartRenderer`).
 *
 * At runtime (outside the editor), the integrator passes data via the
 * `dynamicData` prop on `ChartRenderer` directly. This inject is the
 * fallback `ChartRenderer` uses when the prop is not provided, so the
 * integrator's block component doesn't need to know about editor preview
 * fetching.
 */
export const INJECT_CHART_PREVIEW_DYNAMIC_DATA = Symbol(
  'blokkli_chart_preview_dynamic_data',
) as InjectionKey<ComputedRef<ChartDataSourcePayload | null>>
