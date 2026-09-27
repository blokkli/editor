<template>
  <figure :class="parentType ? '' : WIDTH_CLASSES[options.width]">
    <div v-blokkli-droppable:field_media>
      <MediaImage
        v-if="media"
        v-bind="media"
        :img-class="
          parentType === 'gallery'
            ? 'aspect-[3/2] w-full object-cover'
            : undefined
        "
      />
    </div>
    <figcaption
      v-if="caption || isEditing"
      v-blokkli-editable:field_caption
      :data-placeholder="$texts('placeholder.caption', 'Caption')"
      class="editable-placeholder mt-2 text-sm text-stone-600"
      :class="{ 'px-4': options.width === 'full' && !parentType }"
    >
      {{ caption }}
    </figcaption>
  </figure>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphImageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'
import { WIDTH_CLASSES } from '~/helpers/width'

defineProps<ParagraphImageFragment>()

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  globalOptions: ['width', 'bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
    determineVisibleOptions: (ctx) => (ctx.parentType ? [] : ['width']),
  },
})

const isEditing = import.meta.blokkliEditing
</script>
