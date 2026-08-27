<template>
  <button
    type="button"
    class="flex text-sm bg-accent-100 text-accent-700 py-5 px-8 gap-5 rounded hover:bg-accent-700 hover:text-white font-medium disabled:opacity-50 disabled:pointer-events-none"
  >
    <Icon :name="icon" class="size-15 mt-2" />
    <span>{{ label }}</span>
  </button>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  label: string
  icon: BlokkliIcon
}>()
</script>
