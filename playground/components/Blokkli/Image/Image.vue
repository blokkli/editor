<template>
  <div :class="{ 'container my-40': !parentType }">
    <div
      :class="{ 'overflow-hidden shadow-xl rounded-lg bg-white': isElevated }"
    >
      <img v-if="url" :src="url" :alt="alt" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { MediaImage } from '~/app/mock/state/Media/Media'

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      default: '1',
    },
  },
  editTitle: (el) => el.querySelector('img')?.alt,
})

const props = defineProps<{
  imageReference: MediaImage
}>()

const url = computed(() => props.imageReference.url())
const alt = computed(() => props.imageReference.alt())

const isElevated = computed(() => options.value.elevated == '1')
</script>
