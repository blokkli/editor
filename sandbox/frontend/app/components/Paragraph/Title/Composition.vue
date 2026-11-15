<template>
  <component :is="tag" v-blokkli-editable:field_title>{{ title }}</component>
</template>

<script lang="ts" setup>
import type { ParagraphTitleFragment } from '#graphql-operations'
import { useCompositionChild } from '#blokkli/composition/child'

// A title in a composition: the element the markup asks for (`as`), styled by
// the composition, which puts its class on it. The text is the paragraph's, so
// it's translated like every title.
defineProps<ParagraphTitleFragment>()

defineBlokkli({
  bundle: 'title',
  renderFor: [{ parentBundle: 'composition' }],
  hydrate: 'never',
  editor: {
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
  },
})

const child = useCompositionChild()
const tag = computed(() => child.value?.as ?? 'h2')
</script>
