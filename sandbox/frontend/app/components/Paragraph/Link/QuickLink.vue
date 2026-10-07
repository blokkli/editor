<template>
  <QuickLinksItem v-blokkli-droppable:field_link :url="target.href">
    <span v-blokkli-editable:field_title>{{ label }}</span>
  </QuickLinksItem>
</template>

<script lang="ts" setup>
import type { ParagraphLinkFragment } from '#graphql-operations'

// A frequently searched link (the site config page's quick links), edited on
// the config page. The home page renders them without blökkli.
const props = defineProps<ParagraphLinkFragment>()

const target = computed(() => linkTarget(props.link))

const label = computed(
  () => props.title || target.value.label || target.value.href,
)

defineBlokkli({
  bundle: 'link',
  renderFor: [{ fieldListType: 'quick_links' }],
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_link',
    editTitle: (el) => el.querySelector('a > span')?.textContent,
  },
})
</script>
