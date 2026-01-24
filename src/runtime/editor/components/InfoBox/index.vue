<template>
  <div class="bk-info-box" :class="'bk-is-' + color">
    <Icon :name="icon" />
    <div>
      <slot>
        <p v-html="text" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

withDefaults(
  defineProps<{
    text?: string
    icon?: BlokkliIcon
    color?: 'yellow' | 'accent'
  }>(),
  {
    text: undefined,
    icon: 'bk_mdi_info-fill',
    color: 'yellow',
  },
)
</script>
