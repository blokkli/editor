import { defineEditorComponent } from '#blokkli/editor/composables'
import Datepicker from './index.vue'
import { toDateInputValue } from '#blokkli/editor/helpers/date'

const today = new Date()
const inOneWeek = new Date(today)
inOneWeek.setDate(today.getDate() + 7)
const inOneMonth = new Date(today)
inOneMonth.setMonth(today.getMonth() + 1)
const oneMonthAgo = new Date(today)
oneMonthAgo.setMonth(today.getMonth() - 1)

export default defineEditorComponent({
  id: 'form-datepicker',
  label: 'Datepicker',
  category: 'Form',
  component: Datepicker,
  description:
    'Calendar-style date picker. Values are ISO date strings (`YYYY-MM-DD`).',
  variants: [
    {
      label: 'Default',
      props: {
        modelValue: toDateInputValue(today),
      },
    },
    {
      label: 'Min/max range',
      description: 'Selectable range constrained to the next month.',
      props: {
        modelValue: toDateInputValue(inOneWeek),
        min: toDateInputValue(today),
        max: toDateInputValue(inOneMonth),
      },
    },
    {
      label: 'Error state',
      props: {
        modelValue: toDateInputValue(oneMonthAgo),
        error: true,
      },
    },
    {
      label: 'Disabled',
      props: {
        modelValue: toDateInputValue(today),
        disabled: true,
      },
    },
  ],
})
