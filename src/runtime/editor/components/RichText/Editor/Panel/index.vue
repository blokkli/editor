<template>
  <div class="absolute top-0 left-0 z-50 p-10 size-full" @keydown.stop>
    <div
      class="absolute top-0 left-0 size-full bg-mono-700/95 z-30"
      @click="$emit('close')"
    />
    <div class="bg-white rounded bk-richtext-panel-inner relative z-50">
      <div
        class="bg-mono-200 pl-10 h-30 flex items-center justify-between rounded-t overflow-hidden"
      >
        <div class="text-xs font-semibold uppercase tracking-wider">
          {{ title }}
        </div>
        <button
          class="size-30 flex items-center justify-center hover:bg-mono-300"
          type="button"
          @click.prevent="$emit('close')"
        >
          <Icon name="bk_mdi_close" class="size-15" />
        </button>
      </div>
      <div class="p-10">
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
