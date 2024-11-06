<template>
  <div
    class="bk-blokkli-item-options-checkboxes"
    :class="{ 'bk-is-active': isOpen, 'bk-is-grouped': isGrouped }"
  >
    <button v-if="!isGrouped" @click="isOpen = !isOpen">
      <span>{{ visibleLabel }}</span>
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
    <div v-if="isOpen || isGrouped">
      <label
        v-for="option in options"
        :key="option.value"
        class="bk-blokkli-item-options-checkbox"
      >
        <input
          v-model="checked"
          type="checkbox"
          class="peer"
          :value="option.value"
        />
        <div />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import { BK_VISIBLE_LANGUAGES } from '#blokkli/helpers/symbols'

const { $t, state } = useBlokkli()

const props = defineProps<{
  label: string
  property: string
  modelValue: string
  options: { value: string; label: string }[]
  isGrouped?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

const optionOrder = computed(() => props.options.map((v) => v.value))

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

const visibleLabel = computed(() => {
  if (props.property === BK_VISIBLE_LANGUAGES && !checked.value.length) {
    return $t('optionBkVisibleLanguagesAll', 'Always visible')
  }
  return props.label
})

const toggle = (key: string) => {
  if (!checked.value.includes(key)) {
    checked.value = [...checked.value, key]
  } else {
    checked.value = checked.value.filter((v) => v !== key)
  }
}

defineCommands(() => {
  if (state.editMode.value !== 'editing') {
    return
  }
  return props.options.map((option) => {
    if (checked.value.includes(option.value)) {
      return {
        id: 'options:' + props.property + ':select:' + option.value,
        label: $t(
          'optionsCommand.unselectCheckboxValue',
          'Unselect "@value" in "@option"',
        )
          .replace('@option', props.label)
          .replace('@value', option.label),
        group: 'selection',
        icon: 'form',
        callback: () => toggle(option.value),
      }
    }

    return {
      id: 'options:' + props.property + ':unselect:' + option.value,
      label: $t(
        'optionsCommand.selectCheckboxValue',
        'Select "@value" in "@option"',
      )
        .replace('@option', props.label)
        .replace('@value', option.label),
      group: 'selection',
      icon: 'form',
      callback: () => toggle(option.value),
    }
  })
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormCheckboxes',
}
</script>
