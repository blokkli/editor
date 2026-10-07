<template>
  <li>
    <SiteLink
      v-blokkli-droppable:field_link
      :to="target.href"
      class="block py-1 hover:underline"
    >
      <span v-blokkli-editable:field_title>{{ label }}</span>
    </SiteLink>
  </li>
</template>

<script lang="ts" setup>
import type { ParagraphLinkFragment } from '#graphql-operations'

// One of the header's service links (the site config page's).
const props = defineProps<ParagraphLinkFragment>()

const target = computed(() => linkTarget(props.link))

const label = computed(
  () => props.title || target.value.label || target.value.href,
)

defineBlokkli({
  bundle: 'link',
  renderFor: [{ fieldListType: 'service' }],
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_link',
    editTitle: (el) => el.querySelector('a > span')?.textContent,
  },
})
</script>
