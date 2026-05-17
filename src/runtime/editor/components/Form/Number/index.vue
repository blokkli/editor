<template>
  <div>
    <label v-if="!hideLabel" class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>
    <div class="bk-form-text">
      <input
        :id
        ref="inputRef"
        :value="displayValue"
        type="number"
        class="bk-form-input"
        :placeholder="resolvedPlaceholder"
        :required
        :disabled
        :min
        :max
        :step
        @[updateEvent]="onUpdate"
      />
      <button
        v-show="nullable && value !== undefined"
        type="button"
        :title="$t('clearInput', 'Clear input')"
        @click.prevent="value = undefined"
      >
        <Icon name="bk_mdi_close" />
      </button>
    </div>
    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/editor/components'
import { computed, useBlokkli, useTemplateRef } from '#imports'

const props = defineProps<{
  id: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  /**
   * When true, an empty input emits `undefined`. The placeholder defaults to
   * "Auto" if no explicit placeholder is given.
   */
  nullable?: boolean
  /**
   * If true, the model is only updated on `change` (blur / Enter), matching
   * Vue's `v-model.lazy` behavior. Defaults to eager (per-keystroke).
   */
  lazy?: boolean
  hideLabel?: boolean
}>()

const updateEvent = computed(() => (props.lazy ? 'change' : 'input'))

const value = defineModel<number | undefined>()

const displayValue = computed(() =>
  value.value === undefined ? '' : String(value.value),
)

const { $t } = useBlokkli()

const resolvedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  return props.nullable ? $t('auto', 'Auto') : ''
})

function onUpdate(event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  if (raw === '') {
    if (props.nullable) {
      value.value = undefined
    }
    return
  }
  const parsed = Number(raw)
  if (Number.isFinite(parsed)) {
    value.value = parsed
  }
}

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select(),
})
</script>
