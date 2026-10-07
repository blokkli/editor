<template>
  <figure :class="[spacing, width && WIDTH_CLASSES[width]]">
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
      :class="{ 'container-content': width === 'full' }"
    >
      {{ caption }}
    </figcaption>
  </figure>
</template>

<script lang="ts" setup>
import type { ParagraphImageFragment } from '#graphql-operations'

defineProps<ParagraphImageFragment>()

const block = defineBlokkli({
  bundle: 'image',
  globalOptions: ['width', 'bkVisibleLanguages'],
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
    // Not in nested blocks and on detail pages, where it has no effect
    // (useBlockWidth).
    determineVisibleOptions: (ctx) =>
      ctx.parentType || ctx.entity.entityBundle === 'page' ? [] : ['width'],
  },
})
const { parentType } = block
const spacing = useBlockSpacing(block)
const width = useBlockWidth(block)

const isEditing = import.meta.blokkliEditing
</script>
