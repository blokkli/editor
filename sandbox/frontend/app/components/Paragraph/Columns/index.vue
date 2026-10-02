<template>
  <div
    class="grid gap-x-grid gap-y-flow"
    :class="[spacing, RATIOS[options.ratio], { 'container-wide': !parentType }]"
  >
    <BlokkliField name="field_left" :list="left" edit-class="min-h-16" />
    <BlokkliField name="field_right" :list="right" edit-class="min-h-16" />
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphColumnsFragment } from '#graphql-operations'
import { useBlockSpacing } from '~/composables/useBlockSpacing'

defineProps<ParagraphColumnsFragment>()

const RATIOS = {
  '50-50': 'md:grid-cols-2',
  '33-66': 'md:grid-cols-[1fr_2fr]',
  '66-33': 'md:grid-cols-[2fr_1fr]',
} as const

const block = defineBlokkli({
  bundle: 'columns',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    ratio: {
      type: 'radios',
      label: { en: 'Ratio', de: 'Verhältnis', fr: 'Proportions' },
      default: '50-50',
      displayAs: 'grid',
      options: {
        '50-50': { label: '50 / 50', columns: [1, 1] },
        '33-66': { label: '33 / 66', columns: [1, 2] },
        '66-33': { label: '66 / 33', columns: [2, 1] },
      },
    },
  },
  propsFieldMapping: {
    left: { type: 'field', name: 'field_left' },
    right: { type: 'field', name: 'field_right' },
  },
  editor: {
    icon: 'bk_mdi_view_column_2',
    // The columns have no fields of their own to edit in a form.
    disableEdit: true,
    fieldLayout: [['field_left', 'field_right']],
  },
})
const { options, parentType } = block
const spacing = useBlockSpacing(block)
</script>
