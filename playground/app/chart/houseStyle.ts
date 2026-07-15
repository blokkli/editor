import type { EChartsOption } from 'echarts'
import type { ChartOptionTransform } from '#blokkli/charts/types'

/**
 * Example integrator "house style" for blökkli charts.
 *
 * This is where a project's chart styleguide lives — in userland, NOT in the
 * blökkli module. It returns a {@link ChartOptionTransform} that receives the
 * neutral ECharts option a built-in chart type computed and returns a restyled
 * one. Series/category colors come from the editor (via `context.*HexColors`,
 * already applied on the option) and are never touched here.
 *
 * Pass the result to `<ChartRenderer :transform>`. Recompute it when the color
 * mode / design tokens change so charts re-derive at runtime.
 */
export function createHouseStyle(opts: {
  dark: boolean
}): ChartOptionTransform {
  const label = opts.dark ? '#d1d5db' : '#61615e' // axis / legend text
  const value = opts.dark ? '#f3f4f6' : '#31312e' // data labels
  const line = opts.dark ? '#3f3f3f' : '#cccccc' // gridlines / ticks

  return (option: EChartsOption, context): EChartsOption => {
    // Arial everywhere; base text color.
    option.textStyle = {
      fontFamily: 'Arial, sans-serif',
      color: label,
      ...option.textStyle,
    }

    // Legend: top for cartesian types, right for pie/donut (a common styleguide
    // rule the flat ECharts theme could not express). Placement lives in the
    // option, so it is not re-centered by ECharts' component defaults.
    if (option.legend && !Array.isArray(option.legend)) {
      const legendStyle = {
        icon: 'rect',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: label },
      }
      const toRight = context.type === 'pie' || context.type === 'donut'
      option.legend = toRight
        ? {
            ...option.legend,
            left: undefined,
            bottom: undefined,
            right: 0,
            top: 'middle',
            orient: 'vertical',
            ...legendStyle,
          }
        : {
            ...option.legend,
            bottom: undefined,
            top: 0,
            left: 'center',
            orient: 'horizontal',
            ...legendStyle,
          }
    }

    // Axis furniture: 12px labels, 1px gridlines, ticks in the line color.
    for (const axis of [option.xAxis, option.yAxis].flat()) {
      if (!axis) continue
      Object.assign(axis, {
        axisLabel: { fontSize: 12, color: label, ...axis.axisLabel },
        axisTick: { length: 8, lineStyle: { color: line } },
        splitLine: { lineStyle: { color: line } },
      })
    }

    // Data labels: 12px bold in the value color, but not on stacked series.
    const stacked = context.typeOptions.stacked === true
    for (const s of [option.series].flat()) {
      if (!s) continue
      Object.assign(s, {
        label: {
          show: !stacked,
          fontSize: 12,
          fontWeight: 'bold',
          color: value,
          ...('label' in s ? s.label : undefined),
        },
      })
    }

    return option
  }
}
