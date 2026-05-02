<template>
  <button
    class="bk-panel-action flex flex-col text-mono-800 flex-1 items-center py-10 gap-8 text-sm font-semibold hover:bg-mono-100 hover:text-accent-700"
    :class="{
      'bk-is-active': active,
      'pointer-events-none! bg-mono-100! text-mono-300!': disabled,
    }"
    :disabled
  >
    <Icon :name="icon" class="size-30" />
    <span>{{ title }}</span>
  </button>
</template>

<script setup lang="ts">
import Icon from '#blokkli/editor/components/Icon/index.vue'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  title: string
  icon: BlokkliIcon
  active?: boolean
  disabled?: boolean
}>()
</script>

<style>
.bk-panel-action:not(:last-child) {
  @apply border-r border-r-mono-400;
}
</style>
