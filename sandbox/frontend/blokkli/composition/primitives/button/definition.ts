import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('button', {
  label: 'Button',
  description:
    'A link that looks like the site’s button. Primary for the main action, secondary for the others.',
  props: {
    label: { type: 'text', label: 'Label', default: 'Learn more' },
    url: { type: 'url', label: 'Link' },
    variant: {
      type: 'enum',
      label: 'Style',
      default: 'primary',
      options: {
        primary: { label: 'Primary' },
        secondary: { label: 'Secondary', class: 'is-secondary' },
      },
    },
    onDark: {
      type: 'boolean',
      class: 'is-on-dark',
      label: 'On a dark ground',
      description: 'Set when the button sits on a dark or red background.',
    },
  },
})
