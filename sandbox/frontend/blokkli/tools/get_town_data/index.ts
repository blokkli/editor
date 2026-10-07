import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type {
  ChartDataSource,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'
import { RATES, WATER_PER_PERSON } from '~/utils/feeRates'

export const paramsSchema = z.object({
  topic: z
    .enum(['fees', 'population', 'budget', 'languages'])
    .describe(
      'fees: water, sewage and waste fees. population: residents by nationality per year. budget: expenses by area. languages: main language of the residents.',
    ),
})

const priceSchema = z.object({
  apartment: z.number(),
  house: z.number(),
})

export const resultSchema = z.object({
  label: z.string().describe('What the data is'),
  description: z.string().describe('Units and how to read the numbers'),
  fees: z
    .object({
      water: z.object({ base: priceSchema, perCubicMetre: z.number() }),
      sewage: z.object({ base: priceSchema, perCubicMetre: z.number() }),
      waste: z.object({
        base: z.number(),
        bags: z.array(z.object({ litres: z.number(), price: z.number() })),
        greenBin: z.number(),
      }),
      waterPerPerson: z.number(),
      calculatorPath: z.string(),
    })
    .optional(),
  statistics: z
    .object({
      categories: z.array(z.string()),
      series: z.array(
        z.object({ name: z.string(), data: z.array(z.number()) }),
      ),
    })
    .optional(),
})

type Result = z.infer<typeof resultSchema>

/**
 * The town's own numbers, so that the agent writes with them instead of making
 * them up. An example of a project's tool: the fees come from the code of the
 * fee calculator, the statistics from the app's server, like the charts' data
 * sources (server/api/chart-data).
 */
export default defineBlokkliAgentTool({
  name: 'get_town_data',
  description:
    "Get the official numbers of the town of Blockingen: its fees or its statistics, in the page's language. Use them whenever a text needs fees, prices or figures about the town, and never invent any.",
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  prunedSummary: (r) => r.label,
  label($t) {
    return $t('blockingenAgentTownData', "Getting the town's data")
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const language = ctx.app.context.value.language
    const { $t } = ctx.app

    if (params.topic === 'fees') {
      const result: Result = {
        label: 'Water, sewage and waste fees',
        description: `In CHF with VAT, per household and year. Water and sewage: a base fee by dwelling (apartment or house) plus a price per m³ of water used; sewage is billed by the water used. Waste: a base fee, a price per bag by its size in litres, and a green bin. For estimates, a person uses ${WATER_PER_PERSON} m³ of water a year. The fee calculator is a page of the site: embed it with an embed paragraph that links to calculatorPath.`,
        fees: {
          water: RATES.water,
          sewage: RATES.sewage,
          waste: {
            base: RATES.waste.base,
            bags: Object.entries(RATES.waste.bags).map(([litres, price]) => ({
              litres: Number(litres),
              price,
            })),
            greenBin: RATES.waste.greenBin,
          },
          waterPerPerson: WATER_PER_PERSON,
          calculatorPath: '/embed/fee-calculator',
        },
      }
      return {
        label: $t('blockingenAgentTownDataDone', "Got the town's data"),
        result,
      }
    }

    const query = { language }
    const [sources, data] = await Promise.all([
      $fetch<ChartDataSource[]>('/api/chart-data', { query }),
      $fetch<ChartDataSourcePayload>(`/api/chart-data/${params.topic}`, {
        query,
      }),
    ])
    const source = sources.find((source) => source.id === params.topic)
    const result: Result = {
      label: source?.label ?? params.topic,
      description: source?.description ?? '',
      statistics: {
        categories: data.categories,
        series: data.series,
      },
    }
    return {
      label: $t('blockingenAgentTownDataDone', "Got the town's data"),
      result,
    }
  },
})
