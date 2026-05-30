<template>
  <div
    ref="rootEl"
    class="absolute top-full right-0 bg-white shadow-2xl border border-mono-300 border-t-0"
  >
    <div
      class="bg-mono-200 text-xs font-semibold uppercase tracking-wider border-b border-b-mono-300 flex h-40 items-center justify-between"
    >
      <div class="px-10">{{ title }}</div>
      <button
        class="size-40 flex items-center justify-center hover:bg-mono-300"
        @click.prevent="$emit('close')"
      >
        <Icon name="bk_mdi_close" class="size-15" />
      </button>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useDismiss } from '#blokkli/editor/composables'
import { Icon } from '#blokkli/editor/components'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  title: string
  toggleElement: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const rootEl = useTemplateRef('rootEl')

useDismiss({
  element: rootEl,
  ignore: () => props.toggleElement,
  onDismiss: () => emit('close'),
})
</script>
