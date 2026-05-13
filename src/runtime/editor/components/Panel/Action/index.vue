<template>
  <div class="flex-1 shrink-0 bk-panel-action">
    <button
      class="flex text-mono-800 items-center justify-center py-10 text-sm font-semibold hover:bg-mono-100 hover:text-accent-700 w-full"
      :class="{
        'bk-is-active': active,
        'pointer-events-none! bg-mono-100! text-mono-300!': disabled,
      }"
      :disabled
    >
      <Icon :name="icon" />
      <span>{{ title }}</span>
    </button>
  </div>
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
.bk-panel-action {
  container-type: inline-size;
  > button {
    @apply flex-row px-5 gap-3;

    @container (min-width: 200px) {
      @apply flex-col gap-8;
      .bk-icon {
        @apply size-30;
      }
    }
  }

  .bk-icon {
    @apply size-20;
  }
}
.bk-panel-action:not(:last-child) {
  @apply border-r border-r-mono-400;
}
</style>
