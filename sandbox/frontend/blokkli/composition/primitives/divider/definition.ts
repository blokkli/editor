import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('divider', {
  label: 'Divider',
  description: 'A horizontal rule between parts.',
  props: {
    color: {
      type: 'token',
      group: 'color',
      class: 'border-{token}',
      default: 'line',
      label: 'Colour',
    },
  },
})
