<template>
  <div class="bk-blokkli-item-options-group">
    <button @click.stop.prevent="isVisible = !isVisible">
      <div>{{ label }}</div>
      <Icon name="caret" />
    </button>
    <div v-if="isVisible" class="bk-blokkli-item-options-group-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from '#imports'
import { Icon } from '#blokkli/components'

defineProps<{
  label: string
}>()

const isVisible = ref(false)
</script>
