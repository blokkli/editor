<template>
  <div
    v-blokkli-editable:field_text
    class="container-content rich-text"
    v-html="text"
  />
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphTextFragment } from '#graphql-operations'

defineProps<ParagraphTextFragment>()

defineBlokkli({
  bundle: 'text',
  editor: {
    addBehaviour: 'editable:field_text',
    icon: 'bk_mdi_notes',
    editTitle: (el) => el.textContent,
  },
})
</script>
