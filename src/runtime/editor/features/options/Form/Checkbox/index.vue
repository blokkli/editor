<template>
  <label
    class="bk-blokkli-item-options-checkbox"
    data-test="option-type-checkbox"
  >
    <input
      v-model="checked"
      type="checkbox"
      class="peer"
      :required
      data-test="checkbox-input"
    />
    <div />
    <span data-test="checkbox-label">{{ label }}</span>
  </label>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { defineCommands } from '#blokkli/editor/composables'

const { $t, state } = useBlokkli()

const props = defineProps<{
  label: string
  property?: string
  modelValue?: boolean
  required?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const checked = computed({
  get() {
    return props.modelValue ?? false
  },
  set(v: boolean) {
    emit('update:modelValue', v)
  },
})

defineCommands(() => {
  if (state.editMode.value !== 'editing' || !props.property) {
    return
  }
  return {
    id: 'options:' + props.property + ':toggle',
    label: $t('optionsCommand.setOption', 'Set option "@option" to "@value"')
      .replace('@option', props.label)
      .replace('@value', checked.value ? 'false' : 'true'),
    group: 'selection',
    icon: 'bk_mdi_check_box',
    callback: () => (checked.value = !checked.value),
  }
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormCheckbox',
}
</script>
