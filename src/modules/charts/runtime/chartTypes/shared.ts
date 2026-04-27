import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../../global/types/blockOptions'
import type { TranslateFunction } from './types'
import type { ChartNumberFormat } from '../types'
import { createNumberFormatter } from '../helpers/numberFormat'

type SharedOptions = {
  options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>>
}

export type XAxisTypeOptions = { xaxisRotation: string }
export type DataLabelsTypeOptions = { dataLabels: boolean }
export type LegendTypeOptions = { legendPosition: string }
export type GridTypeOptions = { gridLines: boolean }
export type StrokeWidthTypeOptions = { strokeWidth: string }

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
          auto: $t('chartsRotationAuto', 'Auto'),
          '-45': '-45°',
          '-90': '-90°',
        },
      },
    },
  }
}

/**
 * Build x-axis label config from type options.
 * Returns properties to merge into the xaxis config object.
 */
export function buildXAxisLabelOptions(
  typeOptions: XAxisTypeOptions,
): Record<string, any> {
  const rotation = typeOptions.xaxisRotation
  if (rotation && rotation !== 'auto') {
    return {
      labels: {
        rotate: Number(rotation),
        rotateAlways: true,
      },
    }
  }
  return {}
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
 * Build data labels config from type options.
 */
export function buildDataLabelsOptions(
  typeOptions: DataLabelsTypeOptions,
  format?: ChartNumberFormat,
): Record<string, any> {
  return {
    dataLabels: {
      enabled: !!typeOptions.dataLabels,
      formatter: createNumberFormatter(format),
    },
  }
}

/**
 * Build the standard yaxis-label + tooltip-y formatter pair for chart types
 * that have a numeric axis (bar, line, area, radar). Spread the result into
 * the chart options object.
 */
export function buildValueFormatOptions(
  format: ChartNumberFormat | undefined,
): Record<string, any> {
  const formatter = createNumberFormatter(format)
  return {
    yaxis: { labels: { formatter } },
    tooltip: { y: { formatter } },
  }
}

/**
 * Legend position option for multi-series chart types.
 */
export function legendOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      legendPosition: {
        type: 'radios',
        label: $t('chartsLegendPosition', 'Legend position'),
        default: 'bottom',
        options: {
          bottom: $t('chartsPositionBottom', 'Bottom'),
          top: $t('chartsPositionTop', 'Top'),
          right: $t('chartsPositionRight', 'Right'),
        },
      },
    },
  }
}

/**
 * Build legend config from type options.
 */
export function buildLegendOptions(
  typeOptions: LegendTypeOptions,
): Record<string, any> {
  return { legend: { position: typeOptions.legendPosition || 'bottom' } }
}

/**
 * Grid lines option for chart types with axes.
 */
export function gridOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      gridLines: {
        type: 'checkbox',
        label: $t('chartsGridLines', 'Grid lines'),
        default: true,
        group: 'display',
      },
    },
  }
}

/**
 * Build grid config from type options.
 */
export function buildGridOptions(
  typeOptions: GridTypeOptions,
): Record<string, any> {
  return { grid: { show: !!typeOptions.gridLines } }
}

/**
 * Stroke width option for line-based chart types.
 */
export function strokeWidthOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      strokeWidth: {
        type: 'radios',
        label: $t('chartsStrokeWidth', 'Line thickness'),
        default: '2',
        options: {
          '2': $t('chartsStrokeThin', 'Thin'),
          '4': $t('chartsStrokeMedium', 'Medium'),
          '6': $t('chartsStrokeThick', 'Thick'),
        },
      },
    },
  }
}

/**
 * Build stroke width config from type options.
 */
export function buildStrokeWidthOptions(
  typeOptions: StrokeWidthTypeOptions,
): Record<string, any> {
  return { stroke: { width: Number(typeOptions.strokeWidth) || 2 } }
}

/**
 * Merge multiple shared option sets into one.
 */
export function mergeShared(...sets: SharedOptions[]): SharedOptions {
  const options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>> = {}
  for (const set of sets) {
    Object.assign(options, set.options)
  }
  return { options }
}
