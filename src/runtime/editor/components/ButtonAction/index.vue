<template>
  <button
    :disabled
    class="size-30 flex items-center justify-center group/tooltip rounded-full"
    :class="{
      'hover:bg-mono-200': theme === 'mono',
      'hover:bg-red-normal hover:text-white': theme === 'danger',
      'text-mono-400 bg-white!': disabled,
    }"
  >
    <Icon :name="icon" class="size-[14px]" />
    <Tooltip v-if="label" :label placement="center-before" />
  </button>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import Icon from '#blokkli/editor/components/Icon/index.vue'
import Tooltip from '#blokkli/editor/components/Tooltip/index.vue'

withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
    icon: BlokkliIcon
    theme?: 'mono' | 'accent' | 'danger'
  }>(),
  {
    label: '',
    theme: 'mono',
  },
)
</script>
