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
  'winterthur-population': {
    categories: [
      '00-04',
      '05-09',
      '10-14',
      '15-19',
      '20-24',
      '25-29',
      '30-34',
      '35-39',
      '40-44',
      '45-49',
      '50-54',
      '55-59',
      '60-64',
      '65-69',
      '70-74',
      '75-79',
      '80-84',
      '85-89',
      '90-94',
      '95+',
    ],
    series: [
      {
        name: 'Männer Ausland',
        data: [
          774, 932, 869, 761, 964, 1446, 1876, 1923, 1843, 1492, 1182, 1042,
          800, 495, 312, 262, 201, 125, 46, 7,
        ],
      },
      {
        name: 'Männer Schweiz',
        data: [
          2163, 2284, 2336, 2391, 2562, 3450, 3611, 3426, 3068, 2714, 2487,
          2753, 2711, 2132, 1717, 1421, 1210, 595, 291, 76,
        ],
      },
      {
        name: 'Frauen Ausland',
        data: [
          735, 872, 818, 643, 809, 1253, 1678, 1876, 1692, 1341, 1112, 907, 711,
          480, 328, 282, 200, 164, 41, 9,
        ],
      },
      {
        name: 'Frauen Schweiz',
        data: [
          1982, 2181, 2225, 2281, 2855, 3620, 3602, 3245, 2944, 2738, 2580,
          2819, 3008, 2412, 2088, 1963, 1678, 1082, 553, 201,
        ],
      },
    ],
  },
}

export default defineEventHandler((event): ChartDataSourcePayload => {
  const id = getRouterParam(event, 'id')
  if (!id || !(id in sources)) {
    throw createError({ statusCode: 404, statusMessage: 'Source not found' })
  }
  return sources[id]!
})
