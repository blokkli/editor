import { defineEditorComponent } from '#blokkli/editor/composables'
import Datepicker from './index.vue'

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
        modelValue: formatDate(today),
      },
    },
    {
      label: 'Min/max range',
      description: 'Selectable range constrained to the next month.',
      props: {
        modelValue: formatDate(inOneWeek),
        min: formatDate(today),
        max: formatDate(inOneMonth),
      },
    },
    {
      label: 'Error state',
      props: {
        modelValue: formatDate(oneMonthAgo),
        error: true,
      },
    },
    {
      label: 'Disabled',
      props: {
        modelValue: formatDate(today),
        disabled: true,
      },
    },
  ],
})
