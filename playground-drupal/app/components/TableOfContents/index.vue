<template>
  <BlokkliTableOfContents
    v-slot="{ links }"
    :bundles="['title']"
    :map-item
    :list
  >
    <nav
      v-if="withContact(links).length > 1"
      :aria-label="label"
      class="container-content flex flex-col"
    >
      <h2 class="border-b border-ink pb-2.5 text-label text-muted uppercase">
        {{ label }}
      </h2>
      <ul>
        <li v-for="link in withContact(links)" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="block py-2 text-ink hover:text-primary"
          >
            {{ link.label }}
          </a>
        </li>
      </ul>
    </nav>
  </BlokkliTableOfContents>
</template>

<script lang="ts" setup>
import { computed, useEasyTexts } from '#imports'
import { BlokkliTableOfContents } from '#components'
import type { BlokkliTableOfContentsLink } from '#blokkli/table-of-contents'
import type { NodePageFragment } from '#graphql-operations'
import { anchorId } from '~/helpers/anchor'

// The detail page's table of contents, in its sidebar: links to the headings
// of the title paragraphs in its main field, nested ones included, and to the
// contact after them; from two links. The headings get their ids from
// anchorId().
// The sidebar is another field, so the page passes the main field's list:
// while editing, it shows the saved headings (see BlokkliTableOfContents).
const props = defineProps<{
  list: NodePageFragment['paragraphs']
  contact?: BlokkliTableOfContentsLink | null
}>()

const { $texts } = useEasyTexts()

const label = computed(() => $texts('table_of_contents.label', 'On this page'))

function withContact(links: BlokkliTableOfContentsLink[]) {
  return props.contact ? [...links, props.contact] : links
}

function mapItem(item: {
  props: { title?: string | null }
}): BlokkliTableOfContentsLink | null {
  const id = anchorId(item.props.title)
  return id && item.props.title ? { id, label: item.props.title } : null
}
</script>
