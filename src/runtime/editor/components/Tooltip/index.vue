<template>
  <div
    class="text-white text-sm select-none pointer-events-none leading-none whitespace-nowrap min-h-40 font-sans flex flex-col justify-center"
    :class="{
      '!text-xs !min-h-25 !px-5 !py-3': small,
      'absolute invisible group-hover/tooltip:visible bg-mono-800/90 p-10':
        placement !== 'inline',
      'top-full mt-5': placement.startsWith('below-'),
      'bottom-full mb-5': placement.startsWith('above-'),
      'top-0': placement.startsWith('top-'),
      'bottom-0': placement.startsWith('bottom-'),
      'top-1/2 -translate-y-1/2': placement.startsWith('center-'),
      'left-0': placement.endsWith('-left'),
      'ml-5': placement.endsWith('-left') && margin,
      'right-0': placement.endsWith('-right'),
      'mr-5': placement.endsWith('-right') && margin,
      'left-full ml-5': placement.endsWith('-after'),
      'right-full mr-5': placement.endsWith('-before'),
      'left-1/2 -translate-x-1/2': placement.endsWith('-center'),
    }"
  >
    <div class="flex gap-5 justify-between items-center">
      <div
        class="font-bold text-sm"
        v-html="label"
        :class="{
          'min-w-[250px] whitespace-normal': largeText,
        }"
      />
      <slot name="shortcut" />
    </div>
    <div v-if="description" class="font-normal mt-5 text-xs">
      <div v-if="description" v-html="description" />
    </div>
    <slot name="status" />
  </div>
</template>

<script setup lang="ts">
import type { Placement } from '#blokkli/editor/types/ui'
import { computed } from '#imports'

const props = withDefaults(
  defineProps<{
    label: string
    placement?: Placement | 'inline'
    description?: string | null
    margin?: boolean
    small?: boolean
  }>(),
  {
    placement: 'below-left',
    description: '',
    margin: false,
  },
)

const largeText = computed(() => props.label.length > 20)
</script>
