<template>
  <div :class="{ 'container my-40': !parentType }">
    <div :class="{ 'overflow-hidden shadow-xl rounded-lg': isElevated }">
      <img v-if="url" :src="url" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { FieldReference } from '~/app/mock/state/Field/Reference'
import type { MediaImage } from '~/app/mock/state/Media/Media'

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      default: '0',
    },
  },
})

const props = defineProps<{
  imageReference: FieldReference<MediaImage>
}>()

const image = computed<MediaImage | undefined>(
  () => props.imageReference.getReferencedEntities()[0],
)

const url = computed(() => image.value?.url())

const isElevated = computed(() => options.value.elevated == '1')
</script>
