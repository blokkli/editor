/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    container: false,
  },
  theme: {
    fontFamily: {
      sans: ['PB Inter, sans-serif'],
    },
    extend: {
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
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')({
      className: 'ck-content',
    }),
  ],
}
