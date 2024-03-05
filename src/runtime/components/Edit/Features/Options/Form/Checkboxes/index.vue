<template>
  <div
    class="bk-blokkli-item-options-checkboxes"
    :class="{ 'bk-is-active': isOpen }"
  >
    <button @click="isOpen = !isOpen">
      <span>{{ label }}</span>
      <div>
        <template v-if="checked.length < 4">
          <span v-for="item in checked" :key="item" class="bk-pill">{{
            item
          }}</span>
        </template>
        <span v-else class="bk-pill">{{ checked.length }}</span>
      </div>
      <Icon name="caret" />
    </button>
    <div v-if="isOpen">
      <label
        v-for="option in mappedOptions"
        :key="option.key"
        class="bk-blokkli-item-options-checkbox"
      >
        <input
          v-model="checked"
          type="checkbox"
          class="peer"
          :value="option.key"
        />
        <div />
        <span>{{ option.value }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import defineCommands from '#blokkli/helpers/composables/defineCommands'

const { $t, state } = useBlokkli()

const props = defineProps<{
  label: string
  property: string
  modelValue: string
  options: Record<string, string>
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

const optionOrder = computed(() => Object.keys(props.options))

const checked = computed<string[]>({
  get() {
    return (props.modelValue || '').split(',').filter(Boolean)
  },
  set(newValue: string[]) {
    const storedValue = newValue
      .filter(Boolean)
      .sort((a, b) => {
        // Sort the options keys as defined in the definition.
        // That way we can prevent persisting changes if only the order of
        // the keys would change.
        return optionOrder.value.indexOf(a) - optionOrder.value.indexOf(b)
      })
      .join(',')
    emit('update:modelValue', storedValue)
  },
})

const toggle = (key: string) => {
  if (!checked.value.includes(key)) {
    checked.value = [...checked.value, key]
  } else {
    checked.value = checked.value.filter((v) => v !== key)
  }
}

const mappedOptions = computed(() => {
  return Object.entries(props.options).map(([key, value]) => {
    return { key, value }
  })
})

defineCommands(() => {
  if (state.editMode.value !== 'editing') {
    return
  }
  return optionOrder.value.map((key) => {
    if (checked.value.includes(key)) {
      return {
        id: 'options:' + props.property + ':select:' + key,
        label: $t(
          'optionsCommand.unselectCheckboxValue',
          'Unselect "@value" in "@option"',
        )
          .replace('@option', props.label)
          .replace('@value', props.options[key]),
        group: 'selection',
        icon: 'form',
        callback: () => toggle(key),
      }
    }

    return {
      id: 'options:' + props.property + ':unselect:' + key,
      label: $t(
        'optionsCommand.selectCheckboxValue',
        'Select "@value" in "@option"',
      )
        .replace('@option', props.label)
        .replace('@value', props.options[key]),
      group: 'selection',
      icon: 'form',
      callback: () => toggle(key),
    }
  })
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormCheckboxes',
}
</script>
