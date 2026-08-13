import { computed, type ComputedRef } from '#imports'
import type { EChartsOption } from 'echarts'
import type { ChartTypeRenderProps } from '../types'

/**
 * Wrap a chart type's raw ECharts option and apply the integrator's optional
 * `transform` hook. Each built-in `render.vue` computes its neutral default
 * option in `factory` and passes it through here as its final step.
 *
 * `factory` is intentionally loosely typed (render components author plain
 * option literals, some fields widened to `Record<string, unknown>`); the
 * result is treated as `EChartsOption` at the boundary the transform and
 * `<VChart>` see. Runs in the editor too, so the preview matches the live
 * render — a transform can branch on `context.isEditing`.
 */
export function useChartOption(
  factory: () => unknown,
  props: ChartTypeRenderProps,
): ComputedRef<EChartsOption> {
  return computed(() => {
    const raw = factory() as EChartsOption
    return props.transform ? props.transform(raw, props) : raw
  })
}
