<template>
  <button
    type="button"
    :title="label"
    :disabled="disabled"
    class="size-30 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    :class="
      active
        ? 'bg-accent-100 text-accent-900 hover:bg-accent-200'
        : 'text-mono-700 hover:bg-mono-200 hover:text-mono-950'
    "
    @click="$emit('click')"
  >
    <Icon :name="icon" class="size-15" />
  </button>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  icon: BlokkliIcon
  label: string
  active?: boolean
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<script lang="ts">
export default {
  name: 'RichTextToolbarButton',
}
</script>
