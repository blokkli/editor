import type { TranslateFunction, ChartTypeOptionDefinition } from './types'

type SharedOptions = {
  options: Record<string, ChartTypeOptionDefinition>
  defaults: Record<string, unknown>
}

/**
 * Shared x-axis label options for chart types that display an x-axis.
 */
export function xAxisOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      xaxisRotation: {
        type: 'select',
        label: $t('chartsXAxisRotation', 'Label rotation'),
        options: [
          { value: 'auto', label: $t('chartsRotationAuto', 'Auto') },
          { value: '-45', label: '-45°' },
          { value: '-90', label: '-90°' },
        ],
      },
    },
    defaults: {
      xaxisRotation: 'auto',
    },
  }
}

/**
 * Build x-axis label config from type options.
 * Returns properties to merge into the xaxis config object.
 */
export function buildXAxisLabelOptions(
  typeOptions: Record<string, unknown>,
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
        type: 'toggle',
        label: $t('chartsDataLabels', 'Data labels'),
        group: 'labels',
      },
    },
    defaults: {
      dataLabels: false,
    },
  }
}

/**
 * Build data labels config from type options.
 */
export function buildDataLabelsOptions(
  typeOptions: Record<string, unknown>,
): Record<string, any> {
  return { dataLabels: { enabled: !!typeOptions.dataLabels } }
}

/**
 * Legend position option for multi-series chart types.
 */
export function legendOptions($t: TranslateFunction): SharedOptions {
  return {
    options: {
      legendPosition: {
        type: 'select',
        label: $t('chartsLegendPosition', 'Legend position'),
        options: [
          { value: 'bottom', label: $t('chartsPositionBottom', 'Bottom') },
          { value: 'top', label: $t('chartsPositionTop', 'Top') },
          { value: 'right', label: $t('chartsPositionRight', 'Right') },
        ],
      },
    },
    defaults: {
      legendPosition: 'bottom',
    },
  }
}

/**
 * Build legend config from type options.
 */
export function buildLegendOptions(
  typeOptions: Record<string, unknown>,
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
        type: 'toggle',
        label: $t('chartsGridLines', 'Grid lines'),
        group: 'display',
      },
    },
    defaults: {
      gridLines: true,
    },
  }
}

/**
 * Build grid config from type options.
 */
export function buildGridOptions(
  typeOptions: Record<string, unknown>,
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
        type: 'select',
        label: $t('chartsStrokeWidth', 'Line thickness'),
        options: [
          { value: '2', label: $t('chartsStrokeThin', 'Thin') },
          { value: '4', label: $t('chartsStrokeMedium', 'Medium') },
          { value: '6', label: $t('chartsStrokeThick', 'Thick') },
        ],
      },
    },
    defaults: {
      strokeWidth: '2',
    },
  }
}

/**
 * Build stroke width config from type options.
 */
export function buildStrokeWidthOptions(
  typeOptions: Record<string, unknown>,
): Record<string, any> {
  return { stroke: { width: Number(typeOptions.strokeWidth) || 2 } }
}

/**
 * Merge multiple shared option sets into one.
 */
export function mergeShared(...sets: SharedOptions[]): SharedOptions {
  const options: Record<string, ChartTypeOptionDefinition> = {}
  const defaults: Record<string, unknown> = {}
  for (const set of sets) {
    Object.assign(options, set.options)
    Object.assign(defaults, set.defaults)
  }
  return { options, defaults }
}
