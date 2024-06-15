<template>
  <div
    class="bk-blokkli-item-options-group"
    :class="{ 'bk-is-active': isActive }"
  >
    <button @click.stop.prevent="$emit('toggle')">
      <div>{{ label }}</div>
      <Icon name="caret" />
    </button>
    <div v-if="isActive" class="bk-blokkli-item-options-group-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'

defineProps<{
  label: string
  isActive: boolean
}>()

defineEmits(['toggle'])
</script>
