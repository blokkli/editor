<template>
  <h2
    :id="anchorId(title)"
    v-blokkli-editable:field_title
    class="font-serif text-h2"
    :class="[spacing, { 'container-content': hasContainer }]"
  >
    {{ title }}
  </h2>
</template>

<script lang="ts" setup>
import type { ParagraphTitleFragment } from '#graphql-operations'

defineProps<ParagraphTitleFragment>()

const block = defineBlokkli({
  bundle: 'title',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
  },
})
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
