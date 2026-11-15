import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('spacer', {
  label: 'Spacer',
  description:
    'Empty space. Prefer the gap of a stack or the padding of a box; use this only for an extra space.',
  props: {
    size: {
      type: 'token',
      group: 'space',
      class: 'h-{token}',
      responsive: true,
      default: 'md',
      label: 'Height',
    },
  },
})
