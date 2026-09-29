<template>
  <figure :class="[spacing, parentType ? '' : WIDTH_CLASSES[options.width]]">
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
      class="editable-placeholder mt-2 text-small text-muted"
      :class="{ 'container-content': options.width === 'full' && !parentType }"
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
import { useBlockSpacing } from '~/composables/useBlockSpacing'

defineProps<ParagraphImageFragment>()

const block = defineBlokkli({
  bundle: 'image',
  globalOptions: ['width', 'bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
    determineVisibleOptions: (ctx) => (ctx.parentType ? [] : ['width']),
  },
})
const { options, parentType } = block
const spacing = useBlockSpacing(block)

const isEditing = import.meta.blokkliEditing
</script>
