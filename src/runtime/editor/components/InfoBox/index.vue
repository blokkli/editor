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

<style lang="postcss">
.bk .bk-info-box {
  @apply p-15 rounded-md font-medium;
  @apply flex gap-10 items-center;

  &.bk-is-yellow {
    @apply bg-yellow-light text-yellow-dark border border-yellow-normal;
  }

  &.bk-is-accent {
    @apply bg-accent-50 text-accent-800 border border-accent-200;
  }

  .bk-icon {
    @apply size-30 shrink-0;

    svg {
      @apply fill-current;
    }
  }
}
</style>
