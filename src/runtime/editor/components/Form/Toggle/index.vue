<template>
  <label class="bk-checkbox-toggle">
    <slot />
    <input v-model="value" type="checkbox" class="peer" :disabled />
    <div class="bk-checkbox-toggle-toggle" />
    <div v-if="label || description" class="bk-checkbox-toggle-label">
      <div v-if="label" class="bk-checkbox-toggle-label-label">{{ label }}</div>
      <div v-if="description" class="bk-checkbox-toggle-label-description">
        {{ description }}
      </div>
      <div v-if="disabledReason" class="bk-form-disabled-reason">
        {{ disabledReason }}
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
  description?: string
  disabled?: boolean
  disabledReason?: string | null
}>()

const value = defineModel<boolean>()
</script>
