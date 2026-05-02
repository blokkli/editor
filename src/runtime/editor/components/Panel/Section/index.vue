<template>
  <div class="w-full bk-panel-section">
    <div class="flex items-center gap-5 mb-10">
      <span class="text-lg text-mono-700 font-bold">{{ title }}</span>
      <div v-if="help" class="relative group/tooltip cursor-help group">
        <div
          class="size-18 bg-mono-600 rounded-full p-3 pointer-events-none group-hover:bg-accent-700"
        >
          <Icon name="bk_mdi_question_mark" class="size-full text-mono-200" />
        </div>
        <Tooltip :label="help" placement="below-left" />
      </div>
      <hr class="flex-1 border-mono-300 ml-5" />
    </div>
    <div
      class="bg-white border border-mono-400 shadow-md"
      :class="{ 'pointer-events-none bg-mono-100!': disabled }"
    >
      <div
        v-if="$slots.tabs"
        class="border-b border-b-mono-400 bg-mono-200"
        :class="{
          'opacity-50': disabled,
        }"
      >
        <slot name="tabs" />
      </div>
      <div
        v-if="$slots.default"
        class="bk-panel-section-inner"
        :class="{
          'opacity-50': disabled,
        }"
      >
        <slot />
      </div>
      <div
        v-if="$slots.actions"
        class="border-t border-t-mono-400 overflow-hidden bg-mono-200 p-15"
        :class="{
          'opacity-50': disabled,
          '!border-t-0': !$slots.default,
        }"
      >
        <div
          class="flex items-center bg-white border border-mono-400 overflow-hidden"
        >
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, Tooltip } from '#blokkli/editor/components'

defineProps<{
  title: string
  help?: string
  disabled?: boolean
}>()

defineOptions({
  name: 'PanelSection',
})
</script>

<style>
.bk-panel-section + .bk-panel-section {
  @apply mt-20;

  @variant 2xl {
    @apply mt-30;
  }
}
</style>
