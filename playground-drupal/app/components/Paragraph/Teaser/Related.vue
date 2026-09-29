<template>
  <li v-blokkli-droppable:field_link :class="{ hidden: !url && !isEditing }">
    <NodeTeaser v-if="url" :node :title :lead :url display="link" />
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'teaser.unavailable',
          "The content of this teaser isn't available.",
        )
      }}
    </p>
  </li>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphTeaserFragment } from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import { teaserTarget } from './target'

// A related topic at the end of a detail page: the title as a link and the
// lead below it, without the image.
const props = defineProps<ParagraphTeaserFragment>()

const target = computed(() => teaserTarget(props))
const node = computed(() => target.value.node)
const url = computed(() => target.value.url)

defineBlokkli({
  bundle: 'teaser',
  renderFor: [{ fieldListType: 'related' }],
  globalOptions: ['bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('a > span')?.textContent,
  },
})

const isEditing = import.meta.blokkliEditing
</script>
