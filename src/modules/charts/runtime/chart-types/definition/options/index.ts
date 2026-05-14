import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../../../../global/types/blockOptions'
import type { TranslateFunction } from '../../../types'

type SharedOptions = {
  options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>>
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
          auto: $t('chartsRotationAuto', 'Auto'),
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
 * Merge multiple shared option sets into one.
 */
export function mergeShared(...sets: SharedOptions[]): SharedOptions {
  const options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>> = {}
  for (const set of sets) {
    Object.assign(options, set.options)
  }
  return { options }
}
