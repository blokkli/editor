<template>
  <div :class="{ 'container my-40': !parentType }">
    <div
      v-blokkli-droppable:imageReference
      :class="{
        'overflow-hidden shadow-xl rounded-lg bg-white': options.elevated,
      }"
    >
      <img
        v-if="url"
        :src="url"
        :alt="alt"
        loading="lazy"
        :width="width"
        :height="height"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { MediaImage } from '~/app/mock/state/Media/Media'

type Props = {
  imageReference: MediaImage
}

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      default: true,
    },
  },
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.querySelector('img')?.alt,
    getDraggableElement: (el) => el.querySelector('div'),
    mapDiffProps: (diffProps) => {
      const url = diffProps.imageReference.url()
      return {
        'imageReference.title': diffProps.imageReference.title(),
        'imageReference.image': `<img src="${url}">`,
      }
    },
  },
})

const props = defineProps<Props>()

const url = computed(() => {
  if (props.imageReference instanceof MediaImage) {
    return props.imageReference.url()
  }
  return ''
})

const alt = computed(() => {
  if (props.imageReference instanceof MediaImage) {
    return props.imageReference.alt()
  }
  return ''
})

const width = computed(() => {
  if (props.imageReference instanceof MediaImage) {
    return props.imageReference.width()
  }
  return ''
})

const height = computed(() => {
  if (props.imageReference instanceof MediaImage) {
    return props.imageReference.height()
  }
  return ''
})
</script>
