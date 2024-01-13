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
import { defineBlokkli, computed } from '#imports'
import { MediaImage } from '~/app/mock/state/Media/Media'

const { options, parentType } = defineBlokkli({
  bundle: 'image',
  noAddForm: true,
  options: {
    elevated: {
      type: 'checkbox',
      label: 'Elevated',
      default: '1',
    },
  },
  editTitle: (el) => el.querySelector('img')?.alt,
  determineVisibleOptions: (ctx) => {
    if (ctx.parentType) {
      return []
    }
    return ['elevated']
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

const isElevated = computed(
  () => options.value.elevated == '1' || parentType.value,
)
</script>
