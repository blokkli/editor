<template>
  <div
    v-blokkli-droppable:field_link
    :class="[
      spacing,
      { 'container-content': hasContainer, hidden: !url && !isEditing },
    ]"
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
import type { ParagraphTeaserFragment } from '#graphql-operations'

// A teaser for a page, news item or event, or for any URL. Its title, lead
// and image override the linked node's.
const props = defineProps<ParagraphTeaserFragment>()

const target = computed(() => teaserTarget(props))
const node = computed(() => target.value.node)
const url = computed(() => target.value.url)

const block = defineBlokkli({
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
  // NodeTeaser renders the title and lead, without an element for each, so a
  // change to them previews through the props.
  propsFieldMapping: {
    title: { type: 'editable', name: 'field_title' },
    lead: { type: 'editable', name: 'field_lead' },
    image: { type: 'droppable', name: 'field_media' },
    link: { type: 'droppable', name: 'field_link' },
  },
  editor: {
    icon: 'bk_mdi_article',
    editTitle: (el) => el.querySelector('h3')?.textContent,
    // A related topic is always a link with its text (Related.vue).
    determineVisibleOptions: (ctx) =>
      ctx.fieldListType === 'related' ? [] : ['display'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const isEditing = import.meta.blokkliEditing
</script>
