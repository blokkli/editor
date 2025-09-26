<template>
  <div :class="{ 'container my-40': !parentType }">
    <div
      v-blokkli-droppable:imageReference
      :class="{
        'overflow-hidden shadow-xl rounded-lg bg-white': options.elevated,
      }"
    >
      <img v-if="url" :src="url" :alt loading="lazy" :width :height />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import type { MediaImage } from '#mock/state/Media/Media'

export type Props = {
  imageReference: ReturnType<MediaImage['getData']>
}

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      description: 'Renders the image with a box shadow.',
      default: true,
    },
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('img')?.alt,
    getDraggableElement: (el) => el.querySelector('div'),
    mapDiffProps: (diffProps) => {
      const url = diffProps.imageReference.url
      return {
        'imageReference.title': diffProps.imageReference.title,
        'imageReference.image': `<img src="${url}">`,
      }
    },
  },
})

const props = defineProps<Props>()

const url = computed(() => {
  return props.imageReference.url
})

const alt = computed(() => {
  return props.imageReference.alt
})

const width = computed(() => {
  return props.imageReference.width
})

const height = computed(() => {
  return props.imageReference.height
})
</script>
