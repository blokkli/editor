<template>
  <div class="absolute inset-0 z-50 flex flex-col justify-end">
    <div
      class="bk-panel-sheet-backdrop absolute inset-0 bg-mono-200/90 backdrop-blur-sm"
      @click="$emit('close')"
    />
    <div
      class="bk-panel-sheet-sheet relative z-50 shadow-lg-inverted rounded-t-xl overflow-hidden"
    >
      <div
        class="flex items-center justify-between text-xs uppercase tracking-wide font-semibold text-mono-500 pl-10 h-40 sticky top-0 bg-mono-200 z-10 border-b border-b-mono-200"
      >
        <span>{{ title }}</span>
        <button
          class="size-40 flex items-center justify-center border-none cursor-pointer bg-transparent text-mono-500 hover:bg-mono-100 hover:text-mono-700"
          @click.prevent="$emit('close')"
        >
          <Icon name="bk_mdi_close" class="size-15" />
        </button>
      </div>
      <div class="overflow-auto bk-scrollbar-light h-[500px]">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'

defineProps<{
  title: string
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>
