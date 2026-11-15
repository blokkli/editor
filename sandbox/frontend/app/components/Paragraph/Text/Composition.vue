<template>
  <component
    :is="tag"
    v-blokkli-editable:field_text
    class="rich-text"
    v-html="text"
  />
</template>

<script lang="ts" setup>
import type { ParagraphTextFragment } from '#graphql-operations'
import { useCompositionChild } from '#blokkli/composition/child'

// A rich text in a composition. The composition puts its class on the root and
// styles it there; inside, the site's rich text styles apply, and only the
// inherited properties (font, colour) come from the composition.
defineProps<ParagraphTextFragment>()

defineBlokkli({
  bundle: 'text',
  renderFor: [{ parentBundle: 'composition' }],
  hydrate: 'never',
  editor: {
    icon: 'bk_mdi_notes',
    editTitle: (el) => el.textContent,
  },
})

const child = useCompositionChild()
const tag = computed(() => child.value?.as ?? 'div')
</script>
