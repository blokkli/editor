<template>
  <div class="w-full bk-panel-section">
    <div class="bk-panel-section-inner">
      <div v-if="title" class="flex items-center gap-5 mb-10">
        <span class="text-lg text-mono-700 font-bold">{{ title }}</span>
        <slot name="post-title" />
        <div v-if="help" class="relative group/tooltip cursor-help group z-50">
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
            'p-panel-gap': padded,
          }"
        >
          <slot />
        </div>
        <div
          v-if="$slots.actions"
          class="border-t border-t-mono-400 overflow-hidden bg-mono-200 p-panel-gap"
          :class="{
            'opacity-50': disabled,
            '!border-t-0': !$slots.default,
          }"
        >
          <div
            class="bg-white border border-mono-400 overflow-hidden rounded flex-wrap"
          >
            <div class="flex flex-wrap -mt-1 -mr-1">
              <slot name="actions" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, Tooltip } from '#blokkli/editor/components'

defineProps<{
  title?: string
  help?: string
  disabled?: boolean
  padded?: boolean
}>()

defineOptions({
  name: 'PanelSection',
})
</script>

<style lang="postcss">
.bk-panel-section {
  container-type: inline-size;
}

.bk-panel-section-inner {
  @container (min-width: 500px) {
    --bk-panel-gap: 15px;
  }
}

.bk-panel-section + .bk-panel-section {
  @apply mt-20;

  @variant 2xl {
    @apply mt-30;
  }
}
</style>
