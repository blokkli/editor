<template>
  <BlokkliTableOfContents
    v-slot="{ links }"
    :bundles="['title']"
    option-name="toc"
    :map-item
    :list
  >
    <nav
      v-if="withContact(links).length > 1"
      :aria-label="label"
      class="flex flex-col"
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
import type { BlokkliTableOfContentsLink } from '#blokkli/table-of-contents'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import { getRuntimeOptions } from '#blokkli/runtime-helpers'
import type { NodePageFragment } from '#graphql-operations'

// The detail page's table of contents, in its sidebar: links to the headings
// of the title paragraphs in its main field, nested ones included, unless
// their option "In the table of contents" is off, and to the contact after
// them; from two links. The headings get their ids from their anchor option or
// title (anchorId()).
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

function mapItem(
  item: Extract<FieldListItemTyped, { bundle: 'title' }>,
): BlokkliTableOfContentsLink | null {
  const id = anchorId(getRuntimeOptions(item).anchor || item.props.title)
  return id && item.props.title ? { id, label: item.props.title } : null
}
</script>
