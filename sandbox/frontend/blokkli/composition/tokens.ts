import { defineCompositionTokens } from '#blokkli/composition/types'

// The design tokens of the site (app/assets/css/main.css) that compositions
// may use. Each value is the suffix of the Tailwind utility: the prop decides
// the utility (bg-, text-, gap-, …). The agent's own CSS uses them as custom
// properties (`property`): the theme's, or ones every composition defines
// (`propertyValue`).
export default defineCompositionTokens({
  // Breakpoints follow the composition's own width (container queries): a
  // composition in a narrow column stays narrow.
  rootClass: '@container',
  // How wide a composition is: the page's widest container (container-wide in
  // main.css), 75rem at most, less the gutters on both sides (1rem, 2rem from
  // md, 3rem from lg). For the sizes of its images.
  layout: {
    maxWidth: 1200,
    inset: [
      { from: 0, inset: 32 },
      { from: 768, inset: 64 },
      { from: 1024, inset: 96 },
    ],
  },
  breakpoints: {
    sm: {
      label: 'Small',
      variant: '@min-[30rem]',
      minWidth: '30rem',
      description: 'From 480 px',
    },
    md: {
      label: 'Medium',
      variant: '@min-[48rem]',
      minWidth: '48rem',
      description: 'From 768 px',
    },
    lg: {
      label: 'Large',
      variant: '@min-[64rem]',
      minWidth: '64rem',
      description: 'From 1024 px',
    },
  },
  groups: {
    color: {
      label: 'Colours',
      property: '--color-{name}',
      tokens: {
        white: { value: 'white', label: 'White', swatch: 'var(--color-white)' },
        ink: {
          value: 'ink',
          label: 'Ink',
          description: 'Text, rules and the dark ground.',
          swatch: 'var(--color-ink)',
        },
        muted: {
          value: 'muted',
          label: 'Muted',
          description: 'Secondary text.',
          swatch: 'var(--color-muted)',
        },
        line: {
          value: 'line',
          label: 'Line',
          description: 'Borders and dividers.',
          swatch: 'var(--color-line)',
        },
        surface: {
          value: 'surface',
          label: 'Surface',
          description: 'A light ground for boxes and sections.',
          swatch: 'var(--color-surface)',
        },
        primary: {
          value: 'primary',
          label: 'Red',
          description:
            'The red of the coat of arms, used sparingly: one accent per section, white text on it.',
          swatch: 'var(--color-primary)',
        },
        'primary-dark': {
          value: 'primary-dark',
          label: 'Dark red',
          swatch: 'var(--color-primary-dark)',
        },
        'primary-light': {
          value: 'primary-light',
          label: 'Light red',
          description: 'A light, warm ground; ink text on it.',
          swatch: 'var(--color-primary-light)',
        },
        info: { value: 'info', label: 'Blue', swatch: 'var(--color-info)' },
        'info-light': {
          value: 'info-light',
          label: 'Light blue',
          swatch: 'var(--color-info-light)',
        },
        success: {
          value: 'success',
          label: 'Green',
          swatch: 'var(--color-success)',
        },
        'success-light': {
          value: 'success-light',
          label: 'Light green',
          swatch: 'var(--color-success-light)',
        },
        'warning-light': {
          value: 'warning-light',
          label: 'Light yellow',
          swatch: 'var(--color-warning-light)',
        },
      },
    },
    space: {
      label: 'Spacing',
      property: '--space-{name}',
      propertyValue: 'calc(var(--spacing) * {token})',
      tokens: {
        none: { value: '0', label: 'None' },
        xs: { value: '2', label: 'XS', description: '0.5 rem' },
        sm: { value: '4', label: 'S', description: '1 rem' },
        md: { value: '8', label: 'M', description: '2 rem' },
        lg: { value: '12', label: 'L', description: '3 rem' },
        xl: { value: '20', label: 'XL', description: '5 rem' },
        grid: {
          value: 'grid',
          label: 'Grid',
          description: 'The gap of the page grid; grows with the window.',
          propertyValue: 'var(--spacing-grid)',
        },
        section: {
          value: 'section',
          label: 'Section',
          description: 'Between sections; grows with the window.',
          propertyValue: 'var(--spacing-section)',
        },
      },
    },
    text: {
      label: 'Text sizes',
      description:
        'Each size comes with its line height, and some with a weight and a letter spacing: --text-h1--line-height, --text-h1--font-weight, --text-h1--letter-spacing. Set the font size and its line height together. h1, h2 and lead are in the serif font on this site.',
      property: '--text-{name}',
      tokens: {
        h1: { value: 'h1', label: 'H1', description: 'The page title size.' },
        h2: { value: 'h2', label: 'H2', description: 'Section headings.' },
        h3: { value: 'h3', label: 'H3' },
        lead: {
          value: 'lead',
          label: 'Lead',
          description: 'An introduction below a heading.',
        },
        body: { value: 'body', label: 'Body' },
        small: { value: 'small', label: 'Small' },
        label: {
          value: 'label',
          label: 'Label',
          description: 'Eyebrows above headings, in uppercase.',
        },
      },
    },
    font: {
      label: 'Fonts',
      property: '--font-{name}',
      tokens: {
        sans: {
          value: 'sans',
          label: 'Sans',
          description: 'Source Sans: texts, labels, small headings.',
        },
        serif: {
          value: 'serif',
          label: 'Serif',
          description: 'Source Serif: large headings and leads.',
        },
      },
    },
  },
})
