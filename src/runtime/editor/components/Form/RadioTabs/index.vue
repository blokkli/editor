<template>
  <div>
    <div class="bk-form-label">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </div>
    <div
      class="bk-radio-tabs"
      :class="scheme ? 'bk-scheme-' + scheme : undefined"
    >
      <label v-for="option in options" :key="option.value">
        <input
          v-model="value"
          type="radio"
          :value="option.value"
          :required
          :name="id"
          :disabled
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import type { ThemeColorName } from './../../../../../global/types/theme'

defineProps<{
  id: string
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  description?: string
  scheme?: ThemeColorName
}>()

const value = defineModel<string>()
</script>

<style lang="postcss">
.bk .bk-radio-tabs {
  @apply flex border border-scheme-normal overflow-hidden;

  label {
    @apply flex-1 text-center cursor-pointer relative;

    &:not(:last-child) {
      @apply border-r border-r-scheme-normal;
    }

    input {
      @apply absolute opacity-0 pointer-events-none;
    }

    span {
      @apply block pt-10 pb-[9px] px-5 text-sm font-semibold text-scheme-normal transition-colors whitespace-nowrap leading-none;
    }

    &:has(input:checked) {
      span {
        @apply bg-scheme-normal text-white;
      }
    }
    &:not(:has(input:checked)) {
      &:hover {
        span {
          @apply bg-scheme-light;
        }
      }
    }

    &:has(input:disabled) {
      @apply opacity-50 cursor-not-allowed;
    }
  }
}
</style>
