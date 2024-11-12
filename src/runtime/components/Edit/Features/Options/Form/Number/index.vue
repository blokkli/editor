<template>
  <div class="bk-blokkli-item-options-number">
    <button :disabled="numeric <= min" @click.stop.prevent="decrement">
      <Icon name="minus" />
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

    <button :disabled="numeric >= max" @click.stop.prevent="increment">
      <Icon name="plus" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon } from '#blokkli/components'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue?: string
    min: number
    max: number
    type?: string
  }>(),
  {
    type: 'text',
    modelValue: '0',
  },
)

const width = computed(() => props.max.toString().length * 30)

const emit = defineEmits(['update:modelValue'])

const text = computed<string>({
  get() {
    return props.modelValue
  },
  set(v: string | number | undefined) {
    emit('update:modelValue', (v === undefined ? '' : v).toString())
  },
})

const numeric = computed(() => {
  if (props.modelValue === undefined) {
    return 0
  }
  const v = Number.parseInt(props.modelValue)
  if (Number.isNaN(v)) {
    return 0
  }

  return v
})

function increment() {
  text.value = (numeric.value + 1).toString()
}

function decrement() {
  text.value = (numeric.value - 1).toString()
}
</script>

<script lang="ts">
export default {
  name: 'OptionsFormNumber',
}
</script>
