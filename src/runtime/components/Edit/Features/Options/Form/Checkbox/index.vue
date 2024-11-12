<template>
  <label class="bk-blokkli-item-options-checkbox">
    <input v-model="checked" type="checkbox" class="peer" />
    <div />
    <span>{{ label }}</span>
  </label>
</template>

<script lang="ts" setup>
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { computed, useBlokkli } from '#imports'

const { $t, state } = useBlokkli()

const props = defineProps<{
  label: string
  property: string
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const checked = computed({
  get() {
    return props.modelValue === '1'
  },
  set(v: any) {
    emit('update:modelValue', v ? '1' : '0')
  },
})

defineCommands(() => {
  if (state.editMode.value !== 'editing') {
    return
  }
  return {
    id: 'options:' + props.property + ':toggle',
    label: $t('optionsCommand.setOption', 'Set option "@option" to "@value"')
      .replace('@option', props.label)
      .replace('@value', checked.value ? 'false' : 'true'),
    group: 'selection',
    icon: 'form',
    callback: () => (checked.value = !checked.value),
  }
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormCheckbox',
}
</script>
