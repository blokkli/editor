<template>
  <button
    type="button"
    class="grid grid-cols-[auto_1fr] text-left rounded border bg-white border-mono-200 hover:bg-mono-50 hover:border-mono-400 overflow-hidden"
    :class="
      active
        ? 'border-accent-600! outline-4 outline-accent-200 bg-accent-50!'
        : 'border-mono-300'
    "
  >
    <div
      class="size-[150px] flex items-center justify-center border-r"
      :class="
        active
          ? 'bg-accent-100 border-r-accent-200'
          : 'bg-mono-100 border-r-mono-200'
      "
    >
      <component
        :is="illustration"
        v-if="illustration"
        class="size-full block"
        :class="{
          'grayscale-75': !active,
        }"
      />
      <Icon
        v-else
        :name="editor.icon"
        class="size-70"
        :class="active ? 'text-accent-600' : 'text-mono-500'"
      />
    </div>
    <div class="p-15 flex-1">
      <div class="font-bold text-mono-900 text-lg">
        {{ editor.label }}
      </div>
      <div class="text-sm text-mono-600 leading-snug">
        {{ editor.description }}
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { ChartTypeDefinition } from '../../../../types'
import { Icon } from '#blokkli/editor/components'
import { chartTypeIllustrations } from '#blokkli-build/charts-illustrations'

const props = defineProps<ChartTypeDefinition & { active: boolean }>()

const illustration = computed(
  () => chartTypeIllustrations[props.id as keyof typeof chartTypeIllustrations],
)
</script>
