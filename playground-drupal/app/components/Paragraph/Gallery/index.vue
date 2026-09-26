<template>
  <div :class="parentType ? '' : WIDTH_CLASSES[options.width]">
    <BlokkliField
      v-if="options.display === 'grid'"
      name="field_paragraphs"
      :list="paragraphs"
      drop-alignment="horizontal"
      class="grid grid-cols-2 gap-4 md:grid-cols-3"
      edit-class="min-h-24"
    />
    <div v-else class="relative">
      <BlokkliField
        v-slot="{ items }"
        name="field_paragraphs"
        :list="paragraphs"
        drop-alignment="horizontal"
        proxy-mode
      >
        <ParagraphGallerySlider :items :is-editing />
      </BlokkliField>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphGalleryFragment } from '#graphql-operations'
import ParagraphGallerySlider from './Slider.vue'
import { WIDTH_CLASSES } from '~/helpers/width'

defineProps<ParagraphGalleryFragment>()

const { options, parentType } = defineBlokkli({
  bundle: 'gallery',
  chunkName: 'rare',
  globalOptions: ['width', 'bkVisibleLanguages'],
  options: {
    display: {
      type: 'radios',
      label: 'Display',
      default: 'grid',
      displayAs: 'icons',
      options: {
        grid: { label: 'Grid', icon: 'bk_mdi_grid_view' },
        slider: { label: 'Slider', icon: 'bk_mdi_view_carousel' },
      },
    },
  },
  propsFieldMapping: {
    paragraphs: { type: 'field', name: 'field_paragraphs' },
  },
  editor: {
    icon: 'bk_mdi_photo_library',
    // The gallery has no fields of its own to edit in a form.
    disableEdit: true,
    determineVisibleOptions: (ctx) =>
      ctx.parentType ? ['display'] : ['display', 'width'],
  },
})

const isEditing = import.meta.blokkliEditing
</script>
