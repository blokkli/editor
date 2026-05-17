<template>
  <div class="bk-agent-assistant-bubble bk-is-tool">
    <div class="bk-agent-tool-call">
      <div class="flex items-start text-sm gap-5">
        <StatusIcon v-if="status" :status class="shrink-0" />
        <Icon
          v-else-if="icon"
          :name="icon"
          class="shrink-0 size-20 text-mono-500"
        />
        <span class="flex-1 break-words min-w-0">{{ text }}</span>
        <button
          v-if="$slots.default && expandable"
          class="shrink-0 size-18 flex items-center justify-center rounded text-mono-500 hover:text-mono-900 hover:bg-mono-200"
          :class="{ 'bk-is-expanded': isExpanded }"
          @click="isExpanded = !isExpanded"
        >
          <Icon
            name="bk_mdi_keyboard_arrow_down"
            class="size-15 fill-current transition-transform duration-200 ease-swing"
            :class="{
              'rotate-180': isExpanded,
            }"
          />
        </button>
      </div>
      <TransitionHeight
        v-if="$slots.default && expandable"
        :duration="200"
        opacity
      >
        <div v-if="isExpanded" class="bk-agent-tool-details">
          <div class="pt-10">
            <slot />
          </div>
        </div>
      </TransitionHeight>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon, StatusIcon, TransitionHeight } from '#blokkli/editor/components'

defineProps<{
  text: string
  icon?: BlokkliIcon
  status?: 'pending' | 'active' | 'success' | 'error'
  expandable?: boolean
}>()

const isExpanded = ref(false)
</script>
