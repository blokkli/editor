import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('grid', {
  label: 'Grid',
  description:
    'Places its parts in equal columns. Give it 1 column at base and more from a breakpoint.',
  props: {
    columns: {
      type: 'enum',
      label: 'Columns',
      responsive: true,
      default: '1',
      options: {
        '1': { label: '1', class: 'grid-cols-1' },
        '2': { label: '2', class: 'grid-cols-2' },
        '3': { label: '3', class: 'grid-cols-3' },
        '4': { label: '4', class: 'grid-cols-4' },
      },
    },
    gap: {
      type: 'token',
      group: 'space',
      class: 'gap-{token}',
      responsive: true,
      default: 'grid',
      label: 'Gap',
    },
    align: {
      type: 'enum',
      label: 'Align',
      options: {
        stretch: { label: 'Stretch', class: 'items-stretch' },
        start: { label: 'Top', class: 'items-start' },
        center: { label: 'Centre', class: 'items-center' },
      },
    },
  },
  slots: { default: { label: 'Cells' } },
})
