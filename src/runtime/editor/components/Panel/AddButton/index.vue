<template>
  <button
    type="button"
    class="border-t border-t-mono-300 flex items-center justify-center px-15 py-10 w-full gap-8 hover:bg-mono-100 hover:text-accent-600 first:border-t-0"
  >
    <Icon :name="icon || 'bk_mdi_add'" class="size-18" />
    <span class="font-semibold text-sm">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  label: string
  icon?: BlokkliIcon
}>()
</script>
