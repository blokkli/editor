import plugin from 'tailwindcss/plugin'
import type { Config } from 'tailwindcss'

const z = (index: number, key: string) => {
  return `calc(var(--bk-z-index-base) + ${index}) /* "${key}" */`
}

const zIndexKeys = [
  'main-layout',
  'canvas-overlay',
  'animation-canvas',
  'selection',
  'analyze-tooltip',
  'interaction-overlay',
  'comments-overlay',
  'comments-overlay-active',
  'artboard-scrollbar',
  'artboard-overview',
  'translations-banner-mobile',
  'editable-field',
  'translations-banner-desktop',
  'actions',
  'sidebar',
  'sidebar-tabs',
  'toolbar',
  'selection-add',
  'add-buttons-label',
  'add-list',
  'add-list-info',
  'tour-popup',
  'preview',
  'toolbar-dropdown',
  'drop-targets',
  'dragging-overlay',
  'touch-action-bar',
  'tour-overlay',
  'tour-item',
  'context-menu',
  'search',
  'resizable',
  'transform-overlay',
  'overlay',
  'sidebar-detached',
  'form-overlay',
  'form-overlay-header',
  'dialog',
  'messages',
  'menu',
  'command-palette',
  'library-edit-dialog',
  'nested-editor-overlay-bg',
  'nested-editor-overlay-iframe',
  'init-overlay',
]

// Keys to expose as CSS variables on :root
const zIndexCssVars = ['sidebar-detached']

const zIndex = zIndexKeys.reduce<Record<string, string>>((acc, key, index) => {
  acc[key] = z(index * 10000, key)
  return acc
}, {})

const tailwindConfig: Config = {
  content: [],
  corePlugins: {
    preflight: false,
    container: false,
  },
  theme: {
    fontFamily: {
      sans: ['PB Inter, sans-serif'],
      mono: ['monospace'],
    },
    colors: {
      accent: {
        50: 'rgb(var(--bk-theme-accent-50) / <alpha-value>)',
        100: 'rgb(var(--bk-theme-accent-100) / <alpha-value>)',
        200: 'rgb(var(--bk-theme-accent-200) / <alpha-value>)',
        300: 'rgb(var(--bk-theme-accent-300) / <alpha-value>)',
        400: 'rgb(var(--bk-theme-accent-400) / <alpha-value>)',
        500: 'rgb(var(--bk-theme-accent-500) / <alpha-value>)',
        600: 'rgb(var(--bk-theme-accent-600) / <alpha-value>)',
        700: 'rgb(var(--bk-theme-accent-700) / <alpha-value>)',
        800: 'rgb(var(--bk-theme-accent-800) / <alpha-value>)',
        900: 'rgb(var(--bk-theme-accent-900) / <alpha-value>)',
        950: 'rgb(var(--bk-theme-accent-950) / <alpha-value>)',
      },
      mono: {
        50: 'rgb(var(--bk-theme-mono-50) / <alpha-value>)',
        100: 'rgb(var(--bk-theme-mono-100) / <alpha-value>)',
        200: 'rgb(var(--bk-theme-mono-200) / <alpha-value>)',
        300: 'rgb(var(--bk-theme-mono-300) / <alpha-value>)',
        400: 'rgb(var(--bk-theme-mono-400) / <alpha-value>)',
        500: 'rgb(var(--bk-theme-mono-500) / <alpha-value>)',
        600: 'rgb(var(--bk-theme-mono-600) / <alpha-value>)',
        700: 'rgb(var(--bk-theme-mono-700) / <alpha-value>)',
        800: 'rgb(var(--bk-theme-mono-800) / <alpha-value>)',
        900: 'rgb(var(--bk-theme-mono-900) / <alpha-value>)',
        950: 'rgb(var(--bk-theme-mono-950) / <alpha-value>)',
      },
      teal: {
        light: 'rgb(var(--bk-theme-teal-light) / <alpha-value>)',
        normal: 'rgb(var(--bk-theme-teal-normal) / <alpha-value>)',
        dark: 'rgb(var(--bk-theme-teal-dark) / <alpha-value>)',
      },
      yellow: {
        light: 'rgb(var(--bk-theme-yellow-light) / <alpha-value>)',
        normal: 'rgb(var(--bk-theme-yellow-normal) / <alpha-value>)',
        dark: 'rgb(var(--bk-theme-yellow-dark) / <alpha-value>)',
      },
      red: {
        light: 'rgb(var(--bk-theme-red-light) / <alpha-value>)',
        normal: 'rgb(var(--bk-theme-red-normal) / <alpha-value>)',
        dark: 'rgb(var(--bk-theme-red-dark) / <alpha-value>)',
      },
      lime: {
        light: 'rgb(var(--bk-theme-lime-light) / <alpha-value>)',
        normal: 'rgb(var(--bk-theme-lime-normal) / <alpha-value>)',
        dark: 'rgb(var(--bk-theme-lime-dark) / <alpha-value>)',
      },
      orange: {
        light: 'rgb(var(--bk-theme-orange-light) / <alpha-value>)',
        normal: 'rgb(var(--bk-theme-orange-normal) / <alpha-value>)',
        dark: 'rgb(var(--bk-theme-orange-dark) / <alpha-value>)',
      },
      scheme: {
        light:
          'rgb(var(--bk-scheme-light, var(--bk-theme-accent-100)) / <alpha-value>)',
        normal:
          'rgb(var(--bk-scheme-normal, var(--bk-theme-accent-600)) / <alpha-value>)',
        dark: 'rgb(var(--bk-scheme-dark, var(--bk-theme-accent-800)) / <alpha-value>)',
        text: 'rgb(var(--bk-scheme-text, var(--bk-scheme-dark)) / <alpha-value>)',
      },
      white: 'white',
      black: 'black',
      transparent: 'transparent',
      current: 'currentColor',
    },
    extend: {
      screens: {
        '3xl': '1920px',
      },
      transitionTimingFunction: {
        swing: 'cubic-bezier(0.56, 0.04, 0.25, 1)',
      },
      zIndex: {
        ...zIndex,
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'md-even':
          '0 0px 10px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
        'lg-inverted':
          '0 -10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl-inverted':
          '0 -20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'xl-left':
          '-20px 0px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'xl-even':
          '0 0px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
    spacing: {
      770: '770px',
      340: '340px',
      300: '300px',
      200: '200px',
      120: '120px',
      100: '100px',
      90: '90px',
      80: '80px',
      70: '70px',
      60: '60px',
      50: '50px',
      40: '40px',
      30: '30px',
      25: '25px',
      24: '24px',
      20: '20px',
      18: '18px',
      15: '15px',
      10: '10px',
      8: '8px',
      5: '5px',
      3: '3px',
      2: '2px',
      1: '1px',
      0: '0px',
      'offset-t': 'var(--bk-root-offset-top)',
      'offset-r': 'var(--bk-root-offset-right)',
      'offset-b': 'var(--bk-root-offset-bottom)',
      scrollbar: 'var(--bk-artboard-scrollbar-size)',
      'sidebar-right': 'var(--bk-sidebar-width-right)',
      'toolbar-left': 'var(--bk-toolbar-left-width)',
    },
    borderWidth: {
      DEFAULT: '1px',
      0: '0',
      2: '2px',
      3: '3px',
      4: '4px',
    },
  },
  plugins: [
    plugin(function ({ addVariant, addBase }) {
      addVariant(
        'mobile-only',
        "@media screen and (max-width: theme('screens.sm'))",
      )

      // Expose selected z-index values as CSS variables
      const cssVars = zIndexCssVars.reduce<Record<string, string>>(
        (acc, key) => {
          const index = zIndexKeys.indexOf(key)
          if (index !== -1) {
            acc[`--bk-z-index-${key}`] =
              `calc(var(--bk-z-index-base) + ${index * 10000})`
          }
          return acc
        },
        {},
      )

      addBase({
        ':root': cssVars,
      })
    }),
  ],
}

export default tailwindConfig
