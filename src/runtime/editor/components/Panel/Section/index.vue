<template>
  <div
    class="bg-white border border-mono-400 shadow-md w-full bk-panel-section"
    :class="{ 'pointer-events-none bg-mono-100!': disabled }"
  >
    <div
      class="pl-15 bg-mono-200 flex items-center justify-between gap-5 min-h-40"
      :class="{
        'bg-mono-100! text-mono-400!': disabled,
        'border-b border-b-mono-400': !$slots.tabs,
      }"
    >
      <span
        class="text-xs uppercase tracking-wider text-mono-800 font-semibold leading-none"
        >{{ title }}</span
      >
      <div
        v-if="help"
        class="relative group/tooltip size-40 flex items-center justify-center cursor-help group"
      >
        <div
          class="size-18 bg-mono-600 rounded-full p-3 pointer-events-none group-hover:bg-accent-700"
        >
          <Icon name="bk_mdi_question_mark" class="size-full text-mono-200" />
        </div>
        <Tooltip :label="help" placement="below-right" />
      </div>
    </div>
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
      class="flex items-center border-t border-t-mono-300 overflow-hidden"
      :class="{
        'opacity-50': disabled,
        '!border-t-0': !$slots.default,
      }"
    >
      <slot name="actions" />
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
}
</style>
