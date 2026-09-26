<template>
  <figure v-blokkli-droppable:field_media class="container-wide">
    <MediaImage v-if="media" v-bind="media" class="w-full" />
  </figure>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { ParagraphImageFragment } from '#graphql-operations'
import MediaImage from '~/components/Media/Image/index.vue'

defineProps<ParagraphImageFragment>()

defineBlokkli({
  bundle: 'image',
  editor: {
    icon: 'bk_mdi_image',
    editTitle: (el) => el.querySelector('img')?.alt,
  },
})
</script>
