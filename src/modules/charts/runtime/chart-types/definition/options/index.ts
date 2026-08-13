import type { ChartOption, TranslateFunction } from '../../../types'

type SharedOptions = {
  options: Record<string, ChartOption>
}

/**
 * Shared x-axis label options for chart types that display an x-axis.
 */
export function xAxisOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      xaxisRotation: {
        type: 'radios',
        label: $t('chartsXAxisRotation', 'Label rotation'),
        default: 'auto',
        options: {
          auto: $t('auto', 'Auto'),
          '-45': '-45°',
          '-90': '-90°',
        },
      },
    },
  }
}

/**
 * Data labels option — show values directly on chart elements.
 */
export function dataLabelsOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      dataLabels: {
        type: 'checkbox',
        label: $t('chartsDataLabels', 'Data labels'),
        default: false,
        group: 'labels',
      },
    },
  }
}

/**
 * Y-axis manual start value option.
 *
 * When unset (`undefined`) the chart auto-scales from the data minimum.
 * When set, chart types may force the Y axis to start at the given value.
 */
export function yAxisMinOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      yaxisMin: {
        type: 'number',
        nullable: true,
        label: $t('chartsYAxisMin', 'Y-axis start'),
        group: 'display',
      },
    },
  }
}

/**
 * Runtime category filter — when enabled, the chart wrapper renders a
 * `<select>` above the chart so viewers can pick one category at a time.
 * The wrapper pivots the payload to a 1-series × N-bar shape and passes
 * the original series colors as per-bar colors via `categoryHexColors`.
 */
export function categoryFilterOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      categoryFilter: {
        type: 'checkbox',
        label: $t('chartsCategoryFilter', 'Filterable category axis'),
        default: false,
        group: 'filter',
      },
      categoryFilterLabel: {
        type: 'text',
        label: $t('chartsCategoryFilterLabel', 'Filter label'),
        default: '',
        group: 'filter',
        shouldRender: ({ options }) => options.categoryFilter === true,
      },
    },
  }
}

/**
 * Merge multiple shared option sets into one.
 */
export function mergeShared(...sets: SharedOptions[]): SharedOptions {
  const options: Record<string, ChartOption> = {}
  for (const set of sets) {
    Object.assign(options, set.options)
  }
  return { options }
}
