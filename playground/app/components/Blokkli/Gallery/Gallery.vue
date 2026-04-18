<template>
  <div class="container my-40">
    <div v-blokkli-droppable:images class="grid grid-cols-4 gap-20">
      <div v-for="(img, i) in images" :key="img?.url || i">
        <img
          v-if="img"
          :src="img.url"
          :alt="img.alt"
          loading="lazy"
          :width="img.width"
          :height="img.height"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'
import type { MediaImage } from '#mock/state/Media/Media'

export type Props = {
  images: Array<ReturnType<MediaImage['getData']>>
}

defineBlokkli({
  bundle: 'gallery',
  editor: {
    icon: 'bk_mdi_grid_view',
    addBehaviour: 'no-form',
  },
  propsFieldMapping: {
    images: {
      type: 'droppable',
      name: 'images',
    },
  },
})

defineProps<Props>()
</script>
