<template>
  <button
    type="button"
    class="size-25 flex items-center justify-center group/tooltip text-mono-600 hover:bg-scheme-light hover:text-scheme-dark border-r border-r-mono-400 last:border-r-0 first:rounded-l last:rounded-r"
    :class="'bk-scheme-' + scheme"
    @click.stop="$emit('click')"
  >
    <Icon :name="icon" class="size-15" />
    <Tooltip :label="label" small placement="center-before" />
  </button>
</template>

<script lang="ts" setup>
import { Icon, Tooltip } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { ThemeColorName } from './../../../../../../../global/types/theme'

withDefaults(
  defineProps<{
    icon: BlokkliIcon
    label: string
    scheme?: ThemeColorName
  }>(),
  {
    scheme: 'mono',
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
