<template>
  <h2
    :id="anchorId(title)"
    v-blokkli-editable:field_title
    class="font-serif text-h2"
    :class="[spacing, { 'container-content': !parentType }]"
  >
    {{ title }}
  </h2>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphTitleFragment } from '#graphql-operations'
import { anchorId } from '~/helpers/anchor'
import { useBlockSpacing } from '~/composables/useBlockSpacing'

defineProps<ParagraphTitleFragment>()

const block = defineBlokkli({
  bundle: 'title',
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_format_h2',
    editTitle: (el) => el.textContent,
  },
})
const { parentType } = block
const spacing = useBlockSpacing(block)
</script>
