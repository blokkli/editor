<template>
  <LinkListItem
    v-blokkli-droppable:field_link
    :url="target.href"
    :meta
    :download="target.document"
  >
    <span v-blokkli-editable:field_title>{{ label }}</span>
  </LinkListItem>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphLinkFragment } from '#graphql-operations'
import LinkListItem from '~/components/LinkList/Item.vue'
import { useLanguage } from '~/composables/useLanguage'
import { linkTarget } from './target'

// A link in a link list, as a row. A document gets its type and size, e.g.
// "PDF, 240 kB".
const props = defineProps<ParagraphLinkFragment>()

const language = useLanguage()

const target = computed(() => linkTarget(props.link))

const label = computed(
  () => props.title || target.value.label || target.value.href,
)

// "240 kB" or "1.2 MB", in the page's language (e.g. "1,2 Mo" in French).
function formatSize(bytes: number): string {
  const megabytes = bytes >= 1024 * 1024
  return new Intl.NumberFormat(language.value, {
    style: 'unit',
    unit: megabytes ? 'megabyte' : 'kilobyte',
    maximumFractionDigits: megabytes ? 1 : 0,
  }).format(megabytes ? bytes / 1024 / 1024 : Math.max(1, bytes / 1024))
}

// The type comes from the file's extension.
const meta = computed(() => {
  const { document, href, filesize } = target.value
  if (!document) {
    return undefined
  }
  const extension = href?.split('.').pop()?.toUpperCase()
  return [extension, filesize ? formatSize(filesize) : undefined]
    .filter(Boolean)
    .join(', ')
})

defineBlokkli({
  bundle: 'link',
  renderFor: [{ parentBundle: 'link_list' }],
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_link',
    editTitle: (el) => el.querySelector('a > span')?.textContent,
  },
})
</script>
