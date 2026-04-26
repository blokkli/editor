<template>
  <div class="bk bk-pagination bg-white">
    <button :disabled="page === 0" @click="page--">
      <Icon name="bk_mdi_arrow_left_alt" />
    </button>
    <div>{{ page + 1 }} / {{ totalPages }}</div>
    <button :disabled="page >= totalPages - 1" @click="page++">
      <Icon name="bk_mdi_arrow_right_alt" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'

defineProps<{
  totalPages: number
}>()

const page = defineModel<number>({ default: 0 })
</script>

<style lang="postcss">
.bk .bk-pagination {
  @apply flex justify-between border-t border-t-mono-300 items-center min-h-60;
  flex: 0 0 auto;

  > div {
    @apply text-sm;
  }

  button {
    @apply p-20 hover:bg-mono-100 text-black;

    &:disabled {
      @apply text-mono-300 pointer-events-none;
    }
    svg {
      @apply w-20 h-20 fill-current;
    }
  }
}
</style>
