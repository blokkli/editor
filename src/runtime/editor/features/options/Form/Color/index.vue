<template>
  <div class="bk-blokkli-item-options-color">
    <input v-model="text" type="color" />
    <div
      class="bk-blokkli-item-options-color-preview"
      :style="{
        backgroundColor: modelValue,
      }"
    />
    <div class="bk-blokkli-item-options-color-label">{{ text }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = defineProps<{
  label: string
  modelValue?: string
}>()

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
  name: 'OptionsFormColor',
}
</script>
