<template>
  <div class="bk-blokkli-item-options-number">
    <button :disabled="modelValue <= min" @click.stop.prevent="decrement">
      <Icon name="bk_mdi_remove" />
    </button>
    <input
      v-model="text"
      type="number"
      :min="min"
      :max="max"
      :style="{
        width: width + 'px',
      }"
    />

    <button :disabled="modelValue >= max" @click.stop.prevent="increment">
      <Icon name="bk_mdi_add" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon } from '#blokkli/editor/components'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue?: number
    min: number
    max: number
    type?: string
  }>(),
  {
    type: 'text',
    modelValue: 0,
  },
)

const width = computed(() => props.max.toString().length * 30)

const emit = defineEmits(['update:modelValue'])

const text = computed<string>({
  get() {
    return String(props.modelValue)
  },
  set(v: string | number | undefined) {
    emit('update:modelValue', Number(v) || 0)
  },
})

function increment() {
  emit('update:modelValue', props.modelValue + 1)
}

function decrement() {
  emit('update:modelValue', props.modelValue - 1)
}
</script>

<script lang="ts">
export default {
  name: 'OptionsFormNumber',
}
</script>
