<template>
  <h2
    v-blokkli-editable:field_title
    class="-mb-7.5 pb-2.5 text-label text-muted uppercase"
  >
    {{ title }}
  </h2>
</template>

<script lang="ts" setup>
import type { ParagraphTitleFragment } from '#graphql-operations'

// A heading in the sidebar, styled like its other headings. The negative
// margin takes back most of the sidebar's gap (gap-10), so the heading sits
// right above the block it introduces, e.g. a link list.
defineProps<ParagraphTitleFragment>()

defineBlokkli({
  bundle: 'title',
  renderFor: [{ fieldListType: 'sidebar' }],
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
  },
})
</script>
