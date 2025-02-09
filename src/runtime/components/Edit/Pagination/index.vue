<template>
  <div class="bk bk-pagination">
    <button :disabled="page === 0" @click="page--">
      <Icon name="arrow-left" />
    </button>
    <div>{{ page + 1 }} / {{ totalPages }}</div>
    <button :disabled="page >= totalPages - 1" @click="page++">
      <Icon name="arrow-right" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'

defineProps<{
  totalPages: number
}>()

const page = defineModel<number>({ default: 0 })
</script>
