<template>
  <div class="pb pb-dialog pb-control" @wheel.stop @keydown.stop>
    <div @click="$emit('cancel')" class="pb-dialog-background"></div>
    <div class="pb-dialog-inner" :style="{ width: width + 'px' }">
      <div class="pb-dialog-header">
        <h3>{{ title }}</h3>
        <div v-if="lead">{{ lead }}</div>
      </div>
      <div class="pb-dialog-content">
        <slot></slot>
      </div>
      <div class="pb-dialog-footer">
        <button
          @click="$emit('submit')"
          class="pb-button"
          :disabled="!canSubmit"
          :class="[
            { 'pb-is-loading': isLoading },
            isDanger ? 'pb-is-danger' : 'pb-is-primary',
          ]"
        >
          {{ submitLabel }}
        </button>
        <button @click="$emit('cancel')" class="pb-button">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineEmits(['submit', 'cancel'])
withDefaults(
  defineProps<{
    title: string
    lead?: string
    width?: number
    submitLabel: string
    canSubmit?: boolean
    isDanger?: boolean
    isLoading?: boolean
  }>(),
  {
    width: 600,
    canSubmit: true,
  },
)
</script>
