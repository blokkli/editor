<template>
  <div class="bk-blokkli-item-options-text" data-test="option-type-text">
    <input
      v-model="text"
      :type="type"
      :placeholder="renderedPlaceholder"
      data-test="text-input"
    />
    <div>{{ text }}</div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import type { DefinitionString } from '../../../../../../global/types/blockOptions'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue?: string
    type?: string
    placeholder?: DefinitionString
  }>(),
  {
    type: 'text',
    modelValue: '',
    placeholder: undefined,
  },
)

const emit = defineEmits(['update:modelValue'])

const { definitions } = useBlokkli()

const renderedPlaceholder = computed(() => {
  if (props.placeholder) {
    return definitions.resolveDefinitionString(props.placeholder)
  }

  return props.label
})

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
