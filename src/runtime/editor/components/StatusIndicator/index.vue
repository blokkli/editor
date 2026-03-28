<template>
  <span
    class="size-[0.9em] inline-block rounded-full shrink-0 mr-[0.3em] align-middle"
    :class="{
      'bg-red-normal': status === 'error',
      'bg-lime-normal': status === 'success',
      'bg-yellow-normal': status === 'warning',
    }"
  />
</template>

<script setup lang="ts">
import type { UiStatus } from '#blokkli/editor/types/ui'

withDefaults(
  defineProps<{
    status?: UiStatus
  }>(),
  {
    status: 'error',
  },
)
</script>
