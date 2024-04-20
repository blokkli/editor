<template>
  <div
    class="aspect-square bg-accent-700 rounded-full w-340 mx-auto"
    :class="options.color"
    :style="style"
  />
</template>

<script setup lang="ts">
import { computed, defineBlokkliFragment } from '#imports'

const { options } = defineBlokkliFragment({
  name: 'shader_debug',
  label: 'Shader Debug',
  description: 'Renders elements for shader debugging.',
  editor: {
    previewWidth: 1200,
  },
  options: {
    radius: {
      type: 'radios',
      label: 'Radius',
      default: '24',
      options: {
        '0': 'None',
        '4': '4',
        '24': '24',
        '100': '100',
        '9999': '9999',
      },
    },
    color: {
      type: 'radios',
      label: 'Color',
      default: 'bg-accent-700',
      displayAs: 'colors',
      options: {
        'bg-white': { label: 'White', class: 'bg-white' },
        'bg-black': { label: 'Black', class: 'bg-black' },
        'bg-accent-700': { label: 'Accent', class: 'bg-accent-700' },
        'bg-red-normal': { label: 'Red', class: 'bg-red-normal' },
        'bg-teal-normal': { label: 'Teal', class: 'bg-teal-normal' },
        'bg-yellow-normal': { label: 'Yellow', class: 'bg-yellow-normal' },
        'bg-lime-normal': { label: 'Lime', class: 'bg-lime-normal' },
      },
    },
  },
})

const style = computed(() => {
  return {
    borderRadius: options.value.radius + 'px',
  }
})
</script>
