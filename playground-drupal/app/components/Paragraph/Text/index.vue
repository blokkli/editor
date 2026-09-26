<template>
  <div
    v-blokkli-editable:field_text
    class="rich-text"
    :class="{ 'container-content': !parentType }"
    v-html="text"
  />
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphTextFragment } from '#graphql-operations'

defineProps<ParagraphTextFragment>()

const { parentType } = defineBlokkli({
  bundle: 'text',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    addBehaviour: 'editable:field_text',
    icon: 'bk_mdi_notes',
    editTitle: (el) => el.textContent,
  },
})
</script>
