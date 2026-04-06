<template>
  <div
    class="bk absolute top-0 left-0 size-full z-init-overlay flex items-center justify-center"
    :class="{
      '!fixed !size-screen bg-mono-100': screen,
      'bg-mono-100/90 text-mono-500': theme === 'light',
      'bg-white/90 text-mono-500': theme === 'white',
      'bg-mono-900/90 text-mono-200': theme === 'dark',
    }"
  >
    <Icon name="spinner" class="size-100 animate-spin" />
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'

withDefaults(
  defineProps<{
    theme?: 'white' | 'light' | 'dark'
    screen?: boolean
  }>(),
  {
    screen: false,
    theme: 'light',
  },
)
</script>

<script lang="ts">
export default {
  name: 'Loading',
}
</script>
