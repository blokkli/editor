import type { EChartsOption } from 'echarts'
import type {
  ChartOptionTransform,
  ChartTransformContext,
} from '#blokkli/charts/types'

/**
 * The charts' appearance in the style of the site (the charts module's
 * `transform` hook). Every built-in chart type computes a neutral ECharts
 * option; this adjusts its typography, axes, legend, tooltip and shapes.
 *
 * - The fonts and colours come from the design tokens in main.css, read at
 *   render time (charts only render in the browser), so they follow the
 *   design system.
 * - The series colours are the editor's (colorOptions) and stay untouched.
 * - The figure's caption is the title (Chart/index.vue): the chart draws none.
 * - Like the site: square corners, ink for the baseline, `line` for the grid.
 */

type Obj = Record<string, unknown>

type Tokens = {
  font: string
  ink: string
  muted: string
  line: string
  surface: string
  white: string
}

function readTokens(): Tokens {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string) => style.getPropertyValue(name).trim()
  return {
    font: token('--font-sans'),
    ink: token('--color-ink'),
    muted: token('--color-muted'),
    line: token('--color-line'),
    surface: token('--color-surface'),
    white: token('--color-white'),
  }
}

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Merges the patch into the target, plain objects recursively. */
function merge(target: unknown, patch: Obj): void {
  if (!isObj(target)) {
    return
  }
  for (const [key, value] of Object.entries(patch)) {
    const current = target[key]
    if (isObj(value) && isObj(current)) {
      merge(current, value)
    } else {
      target[key] = value
    }
  }
}

/** An option component that's one object or a list of them. */
function all(value: unknown): Obj[] {
  return (Array.isArray(value) ? value : [value]).filter(isObj)
}

const CARTESIAN = ['bar', 'line', 'area', 'agePyramid']
const LINES = ['line', 'area']
const ROUND = ['pie', 'donut']

function hasName(axis: unknown): boolean {
  return all(axis).some((a) => typeof a.name === 'string' && a.name !== '')
}

/**
 * The title and the data, e.g. "Population. Swiss: 2016 3'968, 2017 3'981.",
 * with the chart's number format (its tooltip's formatter). No words of its
 * own, so it's in the language of the labels.
 */
function describe(o: Obj, context: ChartTransformContext): string {
  const formatter =
    isObj(o.tooltip) && typeof o.tooltip.valueFormatter === 'function'
      ? (o.tooltip.valueFormatter as (value: number) => string)
      : (value: number) => String(value)
  const series = context.series.map(
    (s) =>
      `${s.name}: ${context.categories.map((category, i) => `${category} ${formatter(s.data[i] ?? 0)}`).join(', ')}`,
  )
  return [context.title, ...series].filter(Boolean).join('. ') + '.'
}

/**
 * The transform for a chart of the given width: narrow pies (below 520 px)
 * get a smaller pie higher up, the legend as a list below it, and their labels
 * at the edges, where they can't be cut off.
 */
export function createChartTransform(narrow: boolean): ChartOptionTransform {
  return (option, context) => transform(option, context, narrow)
}

function transform(
  option: EChartsOption,
  context: ChartTransformContext,
  narrow: boolean,
): EChartsOption {
  const t = readTokens()
  const o = option as Obj
  const type = context.type
  const label = { fontFamily: t.font, fontSize: 14, color: t.muted }

  o.textStyle = {
    ...(isObj(o.textStyle) ? o.textStyle : {}),
    fontFamily: t.font,
    color: t.muted,
  }

  // Written by the editor as raw ECharts config: only the site's font.
  if (type === 'advanced') {
    return option
  }

  o.title = { show: false }
  // The chart's label for screen readers (vue-echarts renders it as an
  // image). ECharts' own description is English and garbles stacks.
  o.aria = { enabled: true, label: { description: describe(o, context) } }

  const isBar = type === 'bar' || type === 'agePyramid'
  merge(o.tooltip, {
    backgroundColor: t.white,
    borderColor: t.line,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { fontFamily: t.font, fontSize: 15, color: t.ink },
    extraCssText:
      'border-radius: 0; box-shadow: 0 4px 16px color-mix(in srgb, var(--color-ink) 12%, transparent);',
  })
  if (CARTESIAN.includes(type)) {
    merge(o.tooltip, {
      axisPointer: isBar
        ? { type: 'shadow', shadowStyle: { color: t.surface, opacity: 0.8 } }
        : { type: 'line', lineStyle: { color: t.muted, type: 'dashed' } },
    })
  }

  // Top left, like the site's labels. One series needs none: the caption
  // says what it is, the tooltip names it.
  if (isObj(o.legend)) {
    const single = CARTESIAN.includes(type) && context.series.length < 2
    merge(o.legend, {
      show: o.legend.show !== false && !single,
      top: 0,
      left: 0,
      bottom: 'auto',
      itemGap: 20,
      icon: type === 'radar' ? 'circle' : 'rect',
      // A line for line charts, a square for the rest.
      itemWidth: LINES.includes(type) ? 20 : 12,
      itemHeight: LINES.includes(type) ? 3 : 12,
      textStyle: { ...label, color: t.ink },
    })
    // Pies: below the chart, centred, or a list when narrow.
    if (ROUND.includes(type)) {
      merge(
        o.legend,
        narrow
          ? { top: 'auto', bottom: 0, left: 0, orient: 'vertical', itemGap: 10 }
          : { top: 'auto', bottom: 0, left: 'center' },
      )
    }
  }

  // The value axis carries the grid, the category axis is the ink baseline
  // (on zero, so it also marks the middle of an age pyramid).
  for (const axis of [...all(o.xAxis), ...all(o.yAxis)]) {
    const isValue = axis.type === 'value'
    merge(axis, {
      axisTick: { show: false },
      // Every category, unless they'd overlap.
      axisLabel: isValue
        ? { ...label, margin: 12 }
        : { ...label, margin: 12, interval: 0, hideOverlap: true },
      axisLine: isValue
        ? { show: false }
        : { show: true, lineStyle: { color: t.ink, width: 1.5 } },
      splitLine: isValue
        ? { show: true, lineStyle: { color: t.line, width: 1 } }
        : { show: false },
      nameTextStyle: { ...label, fontWeight: 700, fontSize: 13 },
    })
  }
  // A line shows change, so its value axis fits the data, unless the editor
  // set a minimum. Bars and areas stand for amounts and start at zero.
  if (type === 'line' && typeof context.typeOptions.yaxisMin !== 'number') {
    for (const axis of [...all(o.xAxis), ...all(o.yAxis)]) {
      if (axis.type === 'value') {
        axis.scale = true
      }
    }
  }
  // A vertical axis' title reads above it, left aligned.
  for (const axis of all(o.yAxis)) {
    if (hasName(axis)) {
      merge(axis, {
        nameLocation: 'end',
        nameGap: 16,
        nameTextStyle: { align: 'left' },
      })
    }
  }

  // The plot shrinks to fit its labels and axis titles into the grid, which
  // leaves room for the legend on top.
  if (CARTESIAN.includes(type)) {
    const legendShown = isObj(o.legend) && o.legend.show !== false
    merge(o.grid, {
      outerBoundsMode: 'same',
      outerBoundsContain: 'all',
      left: 0,
      right: 4,
      top: legendShown ? 40 : 4,
      bottom: 0,
    })
  }

  const series = all(o.series)

  if (isBar) {
    const horizontal = all(o.xAxis).some((axis) => axis.type === 'value')
    const stacked = series.filter((s) => s.stack != null).length > 1
    for (const s of series) {
      merge(s, {
        barMaxWidth: 40,
        // A white gap between the segments of a stack.
        ...(stacked
          ? { itemStyle: { borderColor: t.white, borderWidth: 1 } }
          : {}),
        label: stacked
          ? { position: 'inside', fontFamily: t.font, fontSize: 13 }
          : {
              position: horizontal ? 'right' : 'top',
              fontFamily: t.font,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
            },
      })
    }
    if (type === 'bar') {
      // Horizontal bars read from the top, like a list. (Not the age
      // pyramid: its youngest are at the bottom.)
      if (horizontal) {
        for (const axis of all(o.yAxis)) {
          axis.inverse = true
        }
      }
      // With the values on the bars, the value axis would only repeat them.
      // The labels right of horizontal bars need room: the grid only fits
      // the axes' labels.
      if (context.typeOptions.dataLabels === true) {
        for (const axis of [...all(o.xAxis), ...all(o.yAxis)]) {
          if (axis.type === 'value') {
            merge(axis, {
              axisLabel: { show: false },
              splitLine: { show: false },
            })
          }
        }
        if (horizontal) {
          merge(o.grid, { right: 64 })
        }
      }
    }
  }

  if (LINES.includes(type)) {
    for (const s of series) {
      merge(s, {
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 7,
        // Points only while they don't crowd the line.
        showSymbol: context.categories.length <= 12,
        itemStyle: { borderColor: t.white, borderWidth: 2 },
        emphasis: { focus: 'series' },
        ...(type === 'area' ? { areaStyle: { opacity: 0.12 } } : {}),
      })
    }
  }

  if (ROUND.includes(type)) {
    for (const s of series) {
      merge(s, {
        center: ['50%', narrow ? '32%' : '45%'],
        radius: narrow
          ? type === 'donut'
            ? ['28%', '44%']
            : '44%'
          : type === 'donut'
            ? ['42%', '66%']
            : '66%',
        itemStyle: { borderColor: t.white, borderWidth: 2 },
        label: {
          fontFamily: t.font,
          fontSize: 14,
          color: t.ink,
          ...(narrow ? { alignTo: 'edge', edgeDistance: 4 } : {}),
        },
        labelLine: { lineStyle: { color: t.muted } },
      })
    }
    // The donut's total, in its hole.
    merge(o.graphic, {
      top: narrow ? '28%' : '41%',
      style: {
        fill: t.ink,
        fontFamily: t.font,
        fontSize: 22,
        fontWeight: 700,
      },
    })
  }

  if (type === 'radar') {
    merge(o.radar, {
      axisName: { ...label, color: t.ink },
      axisLine: { lineStyle: { color: t.line } },
      splitLine: { lineStyle: { color: t.line } },
      splitArea: { show: false },
    })
    for (const s of series) {
      merge(s, { lineStyle: { width: 2.5 } })
    }
  }

  return option
}
