<template>
  <div
    v-blokkli-editable:field_table
    class="rich-text overflow-x-auto"
    :class="[
      spacing,
      { 'container-content': hasContainer, 'is-striped': options.striped },
    ]"
    v-html="table"
  />
</template>

<script lang="ts" setup>
import type { ParagraphTableFragment } from '#graphql-operations'

defineProps<ParagraphTableFragment>()

const block = defineBlokkli({
  bundle: 'table',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    striped: {
      type: 'checkbox',
      label: {
        en: 'Striped rows',
        de: 'Gestreifte Zeilen',
        fr: 'Lignes alternées',
      },
      default: false,
    },
  },
  editor: {
    // The field has a default table, so the block can be added without the
    // form and edited right away.
    addBehaviour: 'editable:field_table',
    icon: 'bk_mdi_table',
    editTitle: (el) => el.querySelector('caption, th, td')?.textContent,
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
