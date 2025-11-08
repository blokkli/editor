<template>
  <div class="bk-add-item-icon">
    <div class="bk-add-item-icon-inner" :class="'bk-is-' + color">
      <Icon v-if="icon" :name="icon" />
      <ItemIcon v-else-if="bundle" :bundle="bundle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ItemIcon, Icon } from '#blokkli/components'

withDefaults(
  defineProps<{
    icon?: BlokkliIcon
    bundle?: string
    color?: 'rose' | 'lime' | 'default' | 'yellow' | 'accent'
  }>(),
  {
    color: 'default',
    icon: undefined,
    bundle: undefined,
    orientation: 'horizontal',
  },
)
</script>
