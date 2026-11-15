import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('stack', {
  label: 'Stack',
  description:
    'Places its parts in a column or a row, with a gap between them. The usual way to arrange parts.',
  props: {
    direction: {
      type: 'enum',
      label: 'Direction',
      responsive: true,
      default: 'column',
      options: {
        column: { label: 'Column', class: 'flex-col' },
        row: { label: 'Row', class: 'flex-row' },
      },
    },
    gap: {
      type: 'token',
      group: 'space',
      class: 'gap-{token}',
      responsive: true,
      default: 'sm',
      label: 'Gap',
    },
    align: {
      type: 'enum',
      label: 'Align (across)',
      responsive: true,
      options: {
        stretch: { label: 'Stretch', class: 'items-stretch' },
        start: { label: 'Start', class: 'items-start' },
        center: { label: 'Centre', class: 'items-center' },
        end: { label: 'End', class: 'items-end' },
      },
    },
    justify: {
      type: 'enum',
      label: 'Justify (along)',
      responsive: true,
      options: {
        start: { label: 'Start', class: 'justify-start' },
        center: { label: 'Centre', class: 'justify-center' },
        end: { label: 'End', class: 'justify-end' },
        between: { label: 'Space between', class: 'justify-between' },
      },
    },
    wrap: {
      type: 'boolean',
      class: 'flex-wrap',
      label: 'Wrap',
      description: 'A row that is too long continues on the next line.',
    },
  },
  slots: { default: { label: 'Parts' } },
})
