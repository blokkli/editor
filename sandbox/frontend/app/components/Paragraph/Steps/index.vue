<template>
  <div :class="spacing">
    <div
      ref="blokkliDraggable"
      class="-mt-4 pt-4"
      :class="{ 'container-content': hasContainer }"
    >
      <BlokkliField
        name="field_paragraphs"
        :list="paragraphs"
        tag="ol"
        class="border-t border-line"
        edit-class="min-h-16"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { ParagraphStepsFragment } from '#graphql-operations'

// Numbered steps (Step/index.vue), e.g. of a procedure. A heading is a title
// block before them.
//
// In the editor, the steps are the inner element (blokkliDraggable): 16px
// above the list, which its negative margin takes back, and the rows' padding,
// which isn't part of a step, are where a click selects the steps. The
// spacing is the outer element's margin.
defineProps<ParagraphStepsFragment>()

const block = defineBlokkli({
  bundle: 'steps',
  globalOptions: ['bkVisibleLanguages'],
  propsFieldMapping: {
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    icon: 'bk_mdi_format_list_numbered',
    // The steps have no fields of their own to edit in a form.
    disableEdit: true,
    editTitle: (el) => el.querySelector('li h3')?.textContent,
  },
})
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)
</script>
