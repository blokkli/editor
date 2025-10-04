<template>
  <div
    class="bk-list-item-icon"
    :class="['bk-is-' + color, 'bk-is-' + orientation]"
  >
    <Icon v-if="icon" :name="icon" />
    <ItemIcon v-else-if="bundle" :bundle="bundle" />
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ItemIcon, Icon } from '#blokkli/components'
import type { AddListOrientation } from '#blokkli/types'

withDefaults(
  defineProps<{
    icon?: BlokkliIcon
    bundle?: string
    color?: 'rose' | 'lime' | 'default' | 'yellow' | 'accent'
    orientation?: AddListOrientation
  }>(),
  {
    color: 'default',
    icon: undefined,
    bundle: undefined,
    orientation: 'horizontal',
  },
)
</script>
