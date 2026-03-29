<template>
  <div
    class="w-full text-xs font-medium mt-8 flex gap-5"
    :class="'bk-scheme-' + scheme"
  >
    <div
      class="size-[0.75em] rounded-full bg-scheme-normal shrink-0 translate-y-2"
    />
    <div class="whitespace-normal text-scheme-normal">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import type { UiStatus } from '#blokkli/editor/types/ui'
import { computed } from 'vue'
import type { ThemeColorName } from '~~/src/global/types/theme'

const props = defineProps<{
  status: UiStatus
  description: string
}>()

const scheme = computed<ThemeColorName>(() => {
  if (props.status === 'success') {
    return 'lime'
  } else if (props.status === 'warning') {
    return 'yellow'
  }

  return 'red'
})
</script>
