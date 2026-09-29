<template>
  <div :class="{ 'container-content': !parentType }">
    <BlokkliField
      name="field_paragraphs"
      :list="paragraphs"
      tag="ol"
      class="border-t border-line"
      edit-class="min-h-16"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import { BlokkliField } from '#components'
import type { ParagraphStepsFragment } from '#graphql-operations'

// Numbered steps (Step/index.vue), e.g. of a procedure. A heading is a title
// block before them.
defineProps<ParagraphStepsFragment>()

const { parentType } = defineBlokkli({
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
</script>
