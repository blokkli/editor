<template>
  <div :class="spacing">
    <div
      ref="blokkliDraggable"
      class="-mt-4 pt-4"
      :class="{
        'container-content': !parentType && fieldListType === 'default',
      }"
    >
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        tag="ul"
        class="border-t border-ink"
        edit-class="min-h-12"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import { BlokkliField } from '#components'
import type { ParagraphLinkListFragment } from '#graphql-operations'
import { useBlockSpacing } from '~/composables/useBlockSpacing'

// Links and documents, one per row (Link/InList.vue). A heading is a title
// block before the list.
//
// In the editor, the list is the inner element (blokkliDraggable): 16px above
// the list, which its negative margin takes back, and the rows' padding, which
// isn't part of a link, are where a click selects the list. The spacing is the
// outer element's margin.
defineProps<ParagraphLinkListFragment>()

const block = defineBlokkli({
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
const { parentType, fieldListType } = block
const spacing = useBlockSpacing(block)
</script>
