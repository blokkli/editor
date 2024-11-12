<template>
  <div>
    <img
      id="foobar"
      v-if="url"
      v-blokkli-droppable:imageReference
      :src="url"
      class="max-w-120 max-h-120"
    />
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
</script>
