<template>
  <div class="bk-form-overlay-header">
    <ItemIcon v-if="bundle" :bundle="bundle" />
    <div v-else class="bk-blokkli-item-icon">
      <Icon :name="icon" />
    </div>
    <span>{{ title }}</span>
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
  },
)

defineEmits<{
  (e: 'close'): void
}>()
</script>
