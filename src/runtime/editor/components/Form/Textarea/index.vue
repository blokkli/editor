<template>
  <div>
    <label v-if="!hideLabel" class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>
    <textarea
      :id
      :value
      data-test="textarea"
      class="bk-form-input"
      :placeholder
      :required
      :disabled
      :rows="rows ?? 5"
      :minlength
      :maxlength
      @[updateEvent]="onUpdate"
    />
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  minlength?: string | number
  maxlength?: string | number
  rows?: string | number
  hideLabel?: boolean
  lazy?: boolean
}>()

const value = defineModel<string>()

const updateEvent = computed(() => (props.lazy ? 'change' : 'input'))

function onUpdate(event: Event) {
  value.value = (event.target as HTMLInputElement).value
}
</script>
