<template>
  <button
    type="button"
    :disabled
    class="group/tooltip size-25 flex items-center justify-center text-mono-300 hover:bg-mono-700 hover:text-mono-50 disabled:pointer-events-none disabled:text-mono-500"
  >
    <Icon :name="icon" class="size-[13px]" />
    <Tooltip :label placement="above-left" />
  </button>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon, Tooltip } from '#blokkli/editor/components'

defineProps<{
  disabled: boolean
  icon: BlokkliIcon
  label: string
}>()
</script>
