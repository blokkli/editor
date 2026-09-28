/**
 * The town's yearly fees for water, sewage and waste (fictional), in CHF with
 * VAT. Sewage is billed by the water a household uses.
 */
export const RATES = {
  year: 2026,
  water: {
    base: { apartment: 80, house: 140 },
    perCubicMetre: 1.9,
  },
  sewage: {
    base: { apartment: 100, house: 170 },
    perCubicMetre: 2.3,
  },
  waste: {
    base: 75,
    // Per bag, by size in litres.
    bags: { 17: 1.1, 35: 2.2, 60: 3.8 },
    greenBin: 90,
  },
} as const

/**
 * Cubic metres of water per person and year, for the estimate.
 */
export const WATER_PER_PERSON = 50

export type Dwelling = keyof typeof RATES.water.base

export type BagSize = keyof typeof RATES.waste.bags
