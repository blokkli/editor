<template>
  <button class="bk-dropdown-menu-item" :disabled @click="$emit('click')">
    <slot>
      <Icon v-if="icon" :name="icon" />
    </slot>
    <span>{{ text }}</span>
  </button>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'

defineProps<{
  icon?: BlokkliIcon
  text: string
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style lang="postcss">
.bk {
  .bk-dropdown-menu-item {
    @apply w-full flex items-center gap-8 px-10 py-10;
    @apply text-sm text-mono-700 text-left;
    @apply border-none bg-transparent cursor-pointer;
    @apply hover:bg-mono-100 hover:text-mono-950;
    @apply whitespace-nowrap leading-none;

    &:hover svg {
      @apply fill-accent-700;
    }

    svg {
      @apply size-18 fill-current;
    }
  }
}
</style>
