<template>
  <div class="bk-blokkli-item-options-number">
    <button :disabled="!canDecrement" @click.stop.prevent="decrement">
      <Icon name="bk_mdi_remove" />
    </button>
    <input
      v-model="text"
      type="number"
      :min="min"
      :max="max"
      :placeholder="placeholder"
      :style="{
        width: width + 'px',
      }"
    />

    <button :disabled="!canIncrement" @click.stop.prevent="increment">
      <Icon name="bk_mdi_add" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'

const props = defineProps<{
  label: string
  modelValue?: number
  min?: number
  max?: number
  nullable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | undefined): void
}>()

const { $t } = useBlokkli()

const placeholder = computed(() => (props.nullable ? $t('auto', 'Auto') : ''))

const width = computed(() => {
  const candidates = [
    props.min !== undefined ? props.min.toString().length : 0,
    props.max !== undefined ? props.max.toString().length : 0,
    props.modelValue !== undefined ? String(props.modelValue).length : 0,
    placeholder.value.length,
    4,
  ]
  return Math.max(...candidates) * 22
})

const text = computed<string>({
  get() {
    return props.modelValue === undefined ? '' : String(props.modelValue)
  },
  set(v: string | number | undefined) {
    if (typeof v === 'number') {
      if (Number.isFinite(v)) {
        emit('update:modelValue', v)
      }
      return
    }
    const trimmed = (v ?? '').toString().trim()
    if (trimmed === '') {
      if (props.nullable) {
        emit('update:modelValue', undefined)
      }
      return
    }
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      emit('update:modelValue', parsed)
    }
  },
})

const canDecrement = computed(() => {
  if (props.modelValue === undefined) {
    return true
  }
  if (props.min === undefined) {
    return true
  }
  return props.modelValue > props.min
})

const canIncrement = computed(() => {
  if (props.modelValue === undefined) {
    return true
  }
  if (props.max === undefined) {
    return true
  }
  return props.modelValue < props.max
})

function seedValue(): number {
  if (props.modelValue !== undefined) {
    return props.modelValue
  }
  if (props.min !== undefined) {
    return props.min
  }
  if (props.max !== undefined) {
    return Math.min(0, props.max)
  }
  return 0
}

function increment() {
  const next = seedValue() + (props.modelValue === undefined ? 0 : 1)
  if (props.max !== undefined && next > props.max) {
    return
  }
  emit('update:modelValue', next)
}

function decrement() {
  const next = seedValue() - (props.modelValue === undefined ? 0 : 1)
  if (props.min !== undefined && next < props.min) {
    return
  }
  emit('update:modelValue', next)
}
</script>

<script lang="ts">
export default {
  name: 'OptionsFormNumber',
}
</script>
