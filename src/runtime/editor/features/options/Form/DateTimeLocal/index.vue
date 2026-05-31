<template>
  <div
    class="bk-blokkli-item-options-date"
    data-test="option-type-datetime-local"
  >
    <input
      v-model="text"
      type="datetime-local"
      :placeholder="label"
      :min
      :max
      data-test="datetime-input"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = withDefaults(
  defineProps<{
    label: string
    min?: string
    max?: string
    modelValue?: string
  }>(),
  {
    modelValue: '',
    min: '',
    max: '',
  },
)

const emit = defineEmits(['update:modelValue'])

const text = computed<string>({
  get() {
    return props.modelValue || ''
  },
  set(v: string | number | undefined) {
    emit('update:modelValue', (v === undefined ? '' : v).toString())
  },
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormText',
}
</script>
