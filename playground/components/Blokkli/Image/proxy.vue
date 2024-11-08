<template>
  <div v-blokkli-droppable:imageReference>
    <img v-if="url" :src="url" :alt="alt" loading="lazy" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { MediaImage } from '~/app/mock/state/Media/Media'

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
