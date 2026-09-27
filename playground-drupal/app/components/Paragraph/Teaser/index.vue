<template>
  <div
    v-blokkli-droppable:field_node
    :class="{ 'container-content': !parentType, hidden: !node && !isEditing }"
  >
    <NodeTeaser
      v-if="node"
      :node
      :display="options.display"
      :class="{ 'border-y border-stone-300': options.display === 'list' }"
    />
    <p v-else-if="isEditing" class="rounded-sm bg-stone-200 p-4 text-stone-600">
      The content of this teaser isn't available.
    </p>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphTeaserFragment } from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'

defineProps<ParagraphTeaserFragment>()

const { options, parentType } = defineBlokkli({
  bundle: 'teaser',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: 'Display',
      default: 'card',
      options: {
        card: 'Card',
        list: 'List',
      },
    },
  },
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('h3')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
