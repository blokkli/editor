<template>
  <div :class="{ 'container my-40': !parentType }">
    <div
      :class="{
        'overflow-hidden shadow-xl rounded-lg bg-white': options.elevated,
      }"
    >
      <img v-if="url" :src="url" :alt="alt" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { MediaImage } from '~/app/mock/state/Media/Media'

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
  },
})

const props = defineProps<{
  imageReference: MediaImage | object
}>()

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
</script>
