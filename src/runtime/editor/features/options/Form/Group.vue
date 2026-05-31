<template>
  <div
    class="bk-blokkli-item-options-group"
    :class="{ 'bk-is-active': isActive }"
    data-test="option-group"
    :data-test-group="label"
    :data-test-active="isActive"
  >
    <button
      data-test="option-group-toggle"
      @click.stop.prevent="$emit('toggle')"
    >
      <div>{{ label }}</div>
      <Icon name="bk_mdi_arrow_drop_down" />
    </button>
    <div v-if="isActive" class="bk-blokkli-item-options-group-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'

defineProps<{
  label: string
  isActive: boolean
}>()

defineEmits(['toggle'])
</script>
