<template>
  <div
    v-blokkli-droppable:field_link
    :class="{ 'container-content': !parentType, hidden: !url && !isEditing }"
  >
    <NodeTeaser
      v-if="url"
      v-blokkli-droppable:field_media
      :node
      :title
      :lead
      :image
      :url
      :display="options.display"
      :class="{ 'border-t border-line': options.display === 'list' }"
    />
    <p v-else-if="isEditing" class="bg-surface p-4 text-muted">
      {{
        $texts(
          'teaser.unavailable',
          "The content of this teaser isn't available.",
        )
      }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli } from '#imports'
import type { ParagraphTeaserFragment } from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import { teaserTarget } from './target'

// A teaser for a page, news item or event, or for any URL. Its title, lead
// and image override the linked node's.
const props = defineProps<ParagraphTeaserFragment>()

const target = computed(() => teaserTarget(props))
const node = computed(() => target.value.node)
const url = computed(() => target.value.url)

const { options, parentType } = defineBlokkli({
  bundle: 'teaser',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: { en: 'Display', de: 'Darstellung', fr: 'Affichage' },
      default: 'card',
      options: {
        card: { label: { en: 'Card', de: 'Karte', fr: 'Carte' } },
        list: { label: { en: 'List', de: 'Liste', fr: 'Liste' } },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('h3')?.textContent,
    // A related topic is always a link with its text (Related.vue).
    determineVisibleOptions: (ctx) =>
      ctx.fieldListType === 'related' ? [] : ['display'],
  },
})

const isEditing = import.meta.blokkliEditing
</script>
