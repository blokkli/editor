import type { Language } from '#shared/languages'

type Localized = Record<Language, string>

type Dataset = {
  label: Localized
  description: Localized
  categories: (string | Localized)[]
  series: { name: Localized; data: number[] }[]
}

const YEARS = [
  '2016',
  '2017',
  '2018',
  '2019',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
]

/**
 * The chart data sources of the town (fictional numbers), for the charts
 * module's dynamic data. A real site would read them from its statistics
 * office; the payload is the same.
 */
export const CHART_DATA: Record<string, Dataset> = {
  population: {
    label: {
      en: 'Population by nationality, 2016–2025',
      de: 'Wohnbevölkerung nach Nationalität, 2016–2025',
      fr: 'Population résidante par nationalité, 2016–2025',
    },
    description: {
      en: 'Permanent residents at the end of the year.',
      de: 'Ständige Wohnbevölkerung am Jahresende.',
      fr: "Population résidante permanente en fin d'année.",
    },
    categories: YEARS,
    series: [
      {
        name: { en: 'Swiss', de: 'Schweiz', fr: 'Suisse' },
        data: [3968, 3981, 3990, 4012, 4019, 4035, 4061, 4083, 4102, 4127],
      },
      {
        name: { en: 'Foreign', de: 'Ausland', fr: 'Étranger' },
        data: [844, 874, 913, 949, 971, 999, 1041, 1093, 1129, 1171],
      },
    ],
  },
  budget: {
    label: {
      en: 'Budget 2026: expenses by area',
      de: 'Budget 2026: Aufwand nach Aufgabenbereich',
      fr: 'Budget 2026 : charges par domaine',
    },
    description: {
      en: 'In thousands of francs.',
      de: 'In Tausend Franken.',
      fr: 'En milliers de francs.',
    },
    categories: [
      { en: 'Education', de: 'Bildung', fr: 'Formation' },
      {
        en: 'Social security',
        de: 'Soziale Sicherheit',
        fr: 'Sécurité sociale',
      },
      {
        en: 'General administration',
        de: 'Allgemeine Verwaltung',
        fr: 'Administration générale',
      },
      { en: 'Transport', de: 'Verkehr', fr: 'Transports' },
      {
        en: 'Environment and spatial planning',
        de: 'Umwelt und Raumordnung',
        fr: 'Environnement et aménagement',
      },
      {
        en: 'Other (culture, safety, health)',
        de: 'Übrige (Kultur, Sicherheit, Gesundheit)',
        fr: 'Autres (culture, sécurité, santé)',
      },
    ],
    series: [
      {
        name: { en: 'Expenses', de: 'Aufwand', fr: 'Charges' },
        // The last three areas together: a pie reads well up to six slices.
        data: [9420, 6710, 3380, 2650, 2410, 4530],
      },
    ],
  },
  waste: {
    label: {
      en: 'Waste per resident, 2016–2025',
      de: 'Abfall pro Kopf, 2016–2025',
      fr: 'Déchets par habitant, 2016–2025',
    },
    description: {
      en: 'In kilograms.',
      de: 'In Kilogramm.',
      fr: 'En kilogrammes.',
    },
    categories: YEARS,
    series: [
      {
        name: {
          en: 'Household waste',
          de: 'Kehricht',
          fr: 'Ordures ménagères',
        },
        data: [181, 178, 175, 171, 173, 166, 162, 158, 155, 152],
      },
      {
        name: {
          en: 'Separate collection',
          de: 'Separatsammlungen',
          fr: 'Collectes séparées',
        },
        data: [158, 161, 166, 170, 179, 181, 184, 189, 193, 198],
      },
    ],
  },
}

export function localize(value: string | Localized, language: Language) {
  return typeof value === 'string' ? value : value[language]
}
