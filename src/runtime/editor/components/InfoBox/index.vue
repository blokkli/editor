<template>
  <div class="bk-info-box">
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
  }>(),
  {
    text: undefined,
    icon: 'bk_mdi_info-fill',
  },
)
</script>
