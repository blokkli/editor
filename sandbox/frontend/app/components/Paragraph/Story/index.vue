<template>
  <section :class="[spacing, { 'container-wide': hasContainer }]">
    <h2
      v-if="title || isEditing"
      v-blokkli-editable:field_title
      :data-placeholder="$texts('placeholder.title', 'Title')"
      class="editable-placeholder mb-6 text-h2"
    >
      {{ title }}
    </h2>
    <BlokkliField
      v-slot="{ items, shownIndex }"
      name="field_paragraphs"
      :list="paragraphs"
      proxy-mode="slot"
    >
      <ParagraphStoryImages
        v-if="options.layout === 'images'"
        :items
        :shown-index
      />
      <ParagraphStoryTabs
        v-else-if="options.layout === 'tabs'"
        :items
        :shown-index
        :label="title"
      />
      <ParagraphStorySplit v-else :items :shown-index />
    </BlokkliField>
  </section>
</template>

<script lang="ts" setup>
import type { ParagraphStoryFragment } from '#graphql-operations'

// A story: its sections one after the other, in a layout of the story's.
// While editing, the field shows one section at a time below its pages, in
// that layout, and the section is edited in place (proxy-mode="slot"). Modeled
// on a project's scrollytelling block, for building and testing that mode.
defineProps<ParagraphStoryFragment>()

const block = defineBlokkli({
  bundle: 'story',
  chunkName: 'rare',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    layout: {
      type: 'radios',
      label: { en: 'Layout', de: 'Darstellung', fr: 'Mise en page' },
      default: 'split',
      displayAs: 'icons',
      options: {
        split: {
          label: { en: 'Split', de: 'Geteilt', fr: 'Partagé' },
          icon: 'bk_mdi_vertical_split',
        },
        tabs: {
          label: { en: 'Tabs', de: 'Tabs', fr: 'Onglets' },
          icon: 'bk_mdi_side_navigation',
        },
        images: {
          label: { en: 'Images', de: 'Bilder', fr: 'Images' },
          icon: 'bk_mdi_image',
        },
      },
    },
  },
  propsFieldMapping: {
    title: { type: 'editable', name: 'field_title' },
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    addBehaviour: 'editable:field_title',
    icon: 'bk_mdi_auto_stories',
    editTitle: (el) => el.querySelector('h2')?.textContent,
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const hasContainer = useHasContainer(block)

const isEditing = import.meta.blokkliEditing
</script>
