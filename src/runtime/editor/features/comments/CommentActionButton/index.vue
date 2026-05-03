<template>
  <button
    type="button"
    class="size-25 flex items-center justify-center group/tooltip rounded"
    :class="
      variant === 'danger'
        ? 'text-mono-600 hover:bg-red-light hover:text-red-dark'
        : 'text-mono-600 hover:bg-mono-100 hover:text-mono-900'
    "
    @click.stop="$emit('click')"
  >
    <Icon :name="icon" class="size-15" />
    <Tooltip :label="label" small placement="center-before" />
  </button>
</template>

<script lang="ts" setup>
import { Icon, Tooltip } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

withDefaults(
  defineProps<{
    icon: BlokkliIcon
    label: string
    variant?: 'default' | 'danger'
  }>(),
  {
    variant: 'default',
  },
)

defineEmits<{
  (e: 'click'): void
}>()
</script>

<script lang="ts">
export default {
  name: 'CommentActionButton',
}
</script>
