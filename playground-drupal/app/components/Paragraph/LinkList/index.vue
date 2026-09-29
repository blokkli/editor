<template>
  <div
    :class="{ 'container-content': !parentType && fieldListType === 'default' }"
  >
    <BlokkliField
      name="field_paragraphs"
      :list="paragraphs"
      tag="ul"
      class="border-t border-ink"
      edit-class="min-h-12"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import { BlokkliField } from '#components'
import type { ParagraphLinkListFragment } from '#graphql-operations'

// Links and documents, one per row (Link/InList.vue). A heading is a title
// block before the list.
defineProps<ParagraphLinkListFragment>()

const { parentType, fieldListType } = defineBlokkli({
  bundle: 'link_list',
  globalOptions: ['bkVisibleLanguages'],
  propsFieldMapping: {
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    icon: 'bk_mdi_format_list_bulleted',
    // The list has no fields of its own to edit in a form.
    disableEdit: true,
    editTitle: (el) => el.querySelector('li a > span')?.textContent,
  },
})
</script>
