<template>
  <h2
    v-blokkli-editable:field_title
    class="container-content text-2xl font-bold md:text-3xl"
  >
    {{ title }}
  </h2>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphTitleFragment } from '#graphql-operations'

defineProps<ParagraphTitleFragment>()

defineBlokkli({
  bundle: 'title',
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
  },
})
</script>
