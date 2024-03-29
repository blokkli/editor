<template>
  <div class="bk bk-overlay-header">
    <ItemIcon v-if="bundle" :bundle="bundle" />
    <div v-else class="bk-blokkli-item-icon">
      <Icon :name="icon" />
    </div>
    <h3>{{ title }}</h3>
    <button @mousedown.capture.stop="$emit('close')">
      <Icon name="close" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ItemIcon, Icon } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'

withDefaults(
  defineProps<{
    bundle?: string
    icon?: BlokkliIcon
    title: string
  }>(),
  {
    icon: 'form',
    bundle: '',
  },
)

defineEmits<{
  (e: 'close'): void
}>()
</script>
<script lang="ts">
export default {
  name: 'FormOverlayHeader',
}
</script>
