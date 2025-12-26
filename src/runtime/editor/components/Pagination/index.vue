<template>
  <div class="bk bk-pagination">
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
