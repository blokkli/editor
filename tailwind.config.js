/** @type {import('tailwindcss').Config} */

const z = (index) => {
  return `calc(var(--bk-z-index-base) + ${index})`
}

module.exports = {
  corePlugins: {
    preflight: false,
    container: false,
  },
  content: ['./src/runtime/**/*.{vue,js,ts}'],
  theme: {
    fontFamily: {
      sans: ['PB Inter, sans-serif'],
    },
    extend: {
      zIndex: {
        'editable-field': z(600),
        selection: z(700),
        actions: z(800),
        'drop-targets': z(900),
        'transform-overlay': z(910),
        'add-list': z(950),
        'touch-action-bar': z(955),
        'dragging-overlay': z(960),
        sidebar: z(970),
        'sidebar-inner': z(980),
        toolbar: z(1000),
        preview: z(1050),

        search: z(1200),
        'toolbar-dropdown': z(1300),
        messages: z(2000),
        'menu-overlay': z(3000),
        menu: z(3010),
        'artboard-scrollbar': z(3100),
        'edit-form': z(20_000),
        resizable: z(20_100),
        'edit-form-header': z(20_200),
        dialog: z(50_100),
        'init-overlay': z(100_000),
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
        'xl-inverted':
          '0 -20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'xl-left':
          '-20px 0px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      colors: {
        blue: {
          50: '#edf7ff',
          100: '#d7ecff',
          200: '#b7dfff',
          300: '#86cdff',
          400: '#4cb0ff',
          500: '#238cff',
          600: '#0c6bff',
          700: '#0550e6',
          800: '#0c43c1',
          900: '#103d98',
          950: '#0f265c',
        },
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
      20: '20px',
      18: '18px',
      15: '15px',
      10: '10px',
      5: '5px',
      3: '3px',
      2: '2px',
      1: '1px',
      0: '0px',
    },
    borderWidth: {
      DEFAULT: '1px',
      0: '0',
      2: '2px',
      3: '3px',
      4: '4px',
    },
  },
  plugins: [],
}
