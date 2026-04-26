<template>
  <div class="bk-info-box" :class="'bk-scheme-' + color">
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
import type { ThemeColorName } from './../../../../global/types/theme'

withDefaults(
  defineProps<{
    text?: string
    icon?: BlokkliIcon
    color?: ThemeColorName
  }>(),
  {
    text: undefined,
    icon: 'bk_mdi_info-fill',
    color: 'yellow',
  },
)
</script>

<style lang="postcss">
.bk .bk-info-box {
  @apply p-15 font-medium;
  @apply flex gap-10 items-center;
  @apply bg-scheme-light text-scheme-dark border-l-4 border-l-scheme-normal;

  .bk-icon {
    @apply size-30 shrink-0;

    svg {
      @apply fill-current;
    }
  }
}
</style>
