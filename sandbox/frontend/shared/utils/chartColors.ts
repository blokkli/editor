/**
 * The chart colours: blökkli's colorOptions (nuxt.config.ts), shown on the
 * design system page.
 *
 * A family per colour of the design system, each a ramp in OKLCH with that
 * colour (main.css) as its 600. The main shades, in this order, are the palette
 * of new charts: every one has a contrast of at least 3.8:1 on white, and
 * neighbours differ in lightness, for red-green colour blindness. Red, the coat
 * of arms', comes late.
 */
export const CHART_COLORS = {
  lake: {
    label: { en: 'Lake', de: 'See', fr: 'Lac' },
    mainShade: '600',
    shades: {
      100: '#e2f0ff',
      200: '#c0dbf6',
      300: '#9abfe2',
      400: '#77a3ce',
      500: '#5285b4',
      // info
      600: '#1f5a8c',
      700: '#104a79',
    },
  },
  ochre: {
    label: { en: 'Ochre', de: 'Ocker', fr: 'Ocre' },
    mainShade: '500',
    shades: {
      100: '#fdebd5',
      200: '#edd3b2',
      300: '#d7b487',
      400: '#c0965e',
      500: '#a57633',
      // warning
      600: '#8a5a00',
      700: '#633f01',
    },
  },
  forest: {
    label: { en: 'Forest', de: 'Wald', fr: 'Forêt' },
    mainShade: '600',
    shades: {
      100: '#e1f5e4',
      200: '#c3e1c9',
      300: '#9ec6a6',
      400: '#7bac86',
      500: '#578f65',
      // success
      600: '#2c6b3f',
      700: '#19552d',
    },
  },
  plum: {
    label: { en: 'Plum', de: 'Pflaume', fr: 'Prune' },
    mainShade: '500',
    shades: {
      100: '#ffe7f0',
      200: '#fcc6da',
      300: '#e9a3be',
      400: '#d481a3',
      500: '#ba5c85',
      // error
      600: '#8e2a5b',
      700: '#7b1c4c',
    },
  },
  red: {
    label: { en: 'Red', de: 'Rot', fr: 'Rouge' },
    mainShade: '600',
    shades: {
      100: '#ffe9e7',
      200: '#fec8c4',
      300: '#f79f9b',
      400: '#e47b78',
      500: '#cb5554',
      // primary
      600: '#a3212b',
      700: '#88081b',
    },
  },
  stone: {
    label: { en: 'Stone', de: 'Stein', fr: 'Pierre' },
    mainShade: '500',
    shades: {
      100: '#f0eeec',
      200: '#dad7d4',
      300: '#beb9b7',
      400: '#a29d9a',
      500: '#857f7b',
      // muted
      600: '#5c5652',
      700: '#4c4643',
    },
  },
}
