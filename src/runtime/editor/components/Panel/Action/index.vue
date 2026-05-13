<template>
  <button
    class="flex-1 shrink-0 bk-panel-action flex text-mono-800 items-center justify-center py-10 font-semibold hover:bg-mono-100 hover:text-accent-700 w-full whitespace-nowrap border-r border-r-mono-400 border-t border-t-mono-400"
    :class="{
      'pointer-events-none! bg-mono-100! text-mono-300!': disabled,
      'flex-col gap-8 text-sm': isLarge,
      'flex-row px-5 gap-3 text-xs': !isLarge,
    }"
    :disabled
  >
    <Icon :name="icon" :class="isLarge ? 'size-30' : 'size-15'" />
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
  isLarge?: boolean
}>()
</script>
