import { defineEditorComponent } from '#blokkli/editor/composables'
import Pagination from './index.vue'

export default defineEditorComponent({
  id: 'pagination',
  label: 'Pagination',
  category: 'Navigation',
  component: Pagination,
  description:
    'Compact prev/next pager with a "current / total" indicator. Uses `v-model` for the zero-based page index.',
  variants: [
    {
      label: 'Five pages',
      props: {
        totalPages: 5,
        modelValue: 0,
      },
    },
    {
      label: 'Single page',
      description: 'Both arrows are disabled when only one page exists.',
      props: {
        totalPages: 1,
        modelValue: 0,
      },
    },
    {
      label: 'Mid-range',
      props: {
        totalPages: 25,
        modelValue: 12,
      },
    },
  ],
})
