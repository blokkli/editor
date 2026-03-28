<template>
  <div class="bk-status-icon" :class="`bk-is-${status}`">
    <Icon v-if="icon" :name="icon" />
    <span v-else class="bk-status-icon-bullet" v-html="bulletText" />
  </div>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { computed } from '#imports'
import Icon from '../Icon/index.vue'

const props = defineProps<{
  status: 'pending' | 'active' | 'success' | 'error'
  bulletText?: string | number
}>()

const icon = computed<BlokkliIcon | null>(() => {
  if (props.status === 'active') {
    return 'loader'
  } else if (props.status === 'success') {
    return 'bk_mdi_check'
  } else if (props.status === 'error') {
    return 'bk_mdi_priority_high'
  }
  return null
})
</script>

<script lang="ts">
export default {
  name: 'StatusIcon',
}
</script>

<style lang="postcss">
.bk .bk-status-icon {
  @apply size-20 shrink-0 flex items-center justify-center rounded-full leading-none;

  svg {
    @apply w-full h-full fill-current;
  }

  &.bk-is-pending {
    @apply bg-mono-200;
    .bk-status-icon-bullet {
      @apply text-mono-500 text-xs text-center font-bold !leading-none;
    }
  }

  &.bk-is-active {
    @apply p-3 bg-yellow-normal;
    svg {
      @apply fill-white;
    }
  }

  &.bk-is-success {
    @apply p-2 bg-lime-normal text-white;
    svg {
      @apply fill-current;
    }
  }

  &.bk-is-error {
    @apply p-2 bg-red-normal text-white;
    svg {
      @apply fill-current;
    }
  }
}
</style>
