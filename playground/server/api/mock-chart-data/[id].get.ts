import { createError, defineEventHandler, getRouterParam } from 'h3'

type ChartDataSourcePayload = {
  categories: string[]
  series: { name: string; data: number[] }[]
}

const sources: Record<string, ChartDataSourcePayload> = {
  'monthly-sales': {
    categories: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    series: [
      {
        name: 'Revenue',
        data: [120, 135, 148, 162, 158, 175, 182, 190, 185, 198, 205, 220],
      },
      {
        name: 'Costs',
        data: [80, 88, 92, 98, 96, 105, 108, 112, 110, 118, 122, 130],
      },
      {
        name: 'Profit',
        data: [40, 47, 56, 64, 62, 70, 74, 78, 75, 80, 83, 90],
      },
    ],
  },
  'website-traffic': {
    categories: ['Organic', 'Direct', 'Referral', 'Social', 'Email', 'Paid'],
    series: [{ name: 'Sessions', data: [12400, 8200, 3100, 5400, 2200, 4800] }],
  },
  'product-units': {
    categories: ['Widgets', 'Gadgets', 'Sprockets', 'Cogs', 'Bolts'],
    series: [
      { name: 'Q1', data: [120, 95, 78, 110, 65] },
      { name: 'Q2', data: [135, 105, 88, 118, 72] },
    ],
  },
  'temperature-zh': {
    categories: [
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
      '2024-05',
      '2024-06',
    ],
    series: [{ name: 'Temperature', data: [1.2, 2.8, 6.5, 10.4, 14.2, 17.8] }],
  },
}

export default defineEventHandler((event): ChartDataSourcePayload => {
  const id = getRouterParam(event, 'id')
  if (!id || !(id in sources)) {
    throw createError({ statusCode: 404, statusMessage: 'Source not found' })
  }
  return sources[id]!
})
