import { defineCompositionPrimitive } from '#blokkli/composition/types'

export default defineCompositionPrimitive('icon', {
  label: 'Icon',
  description: 'One of the site’s icons.',
  props: {
    name: {
      type: 'enum',
      label: 'Icon',
      default: 'check',
      options: {
        check: { label: 'Check' },
        'arrow-right': { label: 'Arrow right' },
        info: { label: 'Info' },
        clock: { label: 'Clock' },
        document: { label: 'Document' },
        download: { label: 'Download' },
        play: { label: 'Play' },
        plus: { label: 'Plus' },
        search: { label: 'Search' },
        warning: { label: 'Warning' },
      },
    },
    size: {
      type: 'enum',
      label: 'Size',
      default: 'md',
      options: {
        sm: { label: 'Small', class: 'size-5' },
        md: { label: 'Medium', class: 'size-8' },
        lg: { label: 'Large', class: 'size-12' },
        xl: { label: 'Extra large', class: 'size-16' },
      },
    },
    color: {
      type: 'token',
      group: 'color',
      class: 'text-{token}',
      label: 'Colour',
    },
  },
})
