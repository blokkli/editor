import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import type { ChartsModuleOptions } from '../types'

export default function (options: ChartsModuleOptions) {
  return defineCodeTemplate(
    'charts-config',
    () => {
      return `
export const COLORS = ${JSON.stringify(options.colors)}
`
    },
    () => {
      return `
import type { ChartColor } from '#blokkli/charts/types'

export const COLORS: Record<string, ChartColor>
`
    },
    {
      context: 'both',
      write: true,
    },
  )
}
