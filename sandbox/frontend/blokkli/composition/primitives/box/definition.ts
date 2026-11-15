import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('box', {
  label: 'Box',
  description:
    'A container with a background, padding and a width: a section, a band, a card or a panel.',
  props: {
    background: {
      type: 'token',
      group: 'color',
      class: 'bg-{token}',
      label: 'Background',
    },
    textColor: {
      type: 'token',
      group: 'color',
      class: 'text-{token}',
      label: 'Text colour',
      description:
        'The colour of the texts inside that have none of their own.',
    },
    onDark: {
      type: 'boolean',
      class: 'on-dark',
      label: 'Dark ground',
      description:
        'For a dark or red background: the neutral colours inside turn light.',
    },
    paddingX: {
      type: 'token',
      group: 'space',
      class: 'px-{token}',
      responsive: true,
      label: 'Padding left and right',
    },
    paddingY: {
      type: 'token',
      group: 'space',
      class: 'py-{token}',
      responsive: true,
      label: 'Padding top and bottom',
    },
    width: {
      type: 'enum',
      label: 'Width',
      default: 'full',
      options: {
        full: { label: 'Full', class: 'w-full' },
        wide: { label: 'Wide', class: 'mx-auto w-full max-w-wide' },
        content: {
          label: 'Content',
          description: 'A comfortable line length',
          class: 'mx-auto w-full max-w-content',
        },
      },
    },
    border: {
      type: 'token',
      group: 'color',
      class: 'border-2 border-{token}',
      label: 'Border',
    },
    align: {
      type: 'enum',
      label: 'Text alignment',
      responsive: true,
      options: {
        left: { label: 'Left', class: 'text-left' },
        center: { label: 'Centre', class: 'text-center' },
      },
    },
  },
  slots: { default: { label: 'Content' } },
})
