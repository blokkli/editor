<template>
  <div
    class="bg-scheme-light text-scheme-dark border-l-4 border-l-scheme-normal flex items-center"
    :class="[
      'bk-scheme-' + color,
      {
        'p-15 gap-10': !small,
        'p-10 gap-5 text-sm': small,
      },
    ]"
  >
    <Icon
      :name="icon"
      class="shrink-0"
      :class="small ? 'size-20' : 'size-30'"
    />
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
import type { ThemeColorName } from './../../../../global/types/theme'

withDefaults(
  defineProps<{
    text?: string
    icon?: BlokkliIcon
    color?: ThemeColorName
    small?: boolean
  }>(),
  {
    text: undefined,
    icon: 'bk_mdi_info-fill',
    color: 'yellow',
    small: false,
  },
)
</script>
