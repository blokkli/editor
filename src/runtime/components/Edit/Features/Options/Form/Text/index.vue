<template>
  <div class="bk-blokkli-item-options-text" :class="'bk-is-type-' + type">
    <input v-model="text" :type="type" :placeholder="label" />
    <div>{{ text }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: string
    type?: string
  }>(),
  {
    type: 'text',
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
