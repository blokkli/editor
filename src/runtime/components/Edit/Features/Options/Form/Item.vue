<template>
  <div class="bk-blokkli-item-options-item" @keydown.stop>
    <div
      :class="isGrouped ? 'bk-blokkli-item-options-item-label' : 'bk-tooltip'"
    >
      <span>{{ option.label }}</span>
    </div>
    <div class="bk-blokkli-item-options-item-content">
      <OptionRadios
        v-if="option.type === 'radios'"
        v-model="value"
        :label="option.label"
        :options="option.options"
        :property="property"
        :display-as="option.displayAs"
      />
      <OptionCheckbox
        v-else-if="option.type === 'checkbox'"
        v-model="value"
        :property="property"
        :label="option.label"
        :value="value"
      />
      <OptionCheckboxes
        v-else-if="option.type === 'checkboxes'"
        v-model="value"
        :property="property"
        :label="option.label"
        :options="option.options"
        :value="value"
      />
      <OptionText
        v-else-if="option.type === 'text'"
        v-model="value"
        :label="option.label"
        :type="option.inputType"
      />
      <OptionColor
        v-else-if="option.type === 'color'"
        v-model="value"
        :label="option.label"
      />
      <OptionRange
        v-else-if="option.type === 'range'"
        v-model="value"
        :label="option.label"
        :min="option.min"
        :max="option.max"
        :step="option.step"
      />
      <OptionNumber
        v-else-if="option.type === 'number'"
        v-model="value"
        :label="option.label"
        :min="option.min"
        :max="option.max"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import OptionRadios from './Radios/index.vue'
import OptionCheckbox from './Checkbox/index.vue'
import OptionCheckboxes from './Checkboxes/index.vue'
import OptionText from './Text/index.vue'
import OptionColor from './Color/index.vue'
import OptionRange from './Range/index.vue'
import OptionNumber from './Number/index.vue'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

const { state } = useBlokkli()

const emit = defineEmits<{
  (e: 'update', data: string): void
}>()

const props = defineProps<{
  option: BlockOptionDefinition
  property: string
  uuids: string[]
  isGrouped?: boolean
}>()

const validateValue = (
  v: string | string[] | boolean | undefined | null | number,
): string | undefined => {
  if (props.option.type === 'text') {
    if (typeof v === 'string') {
      return v
    }
  } else if (props.option.type === 'color') {
    if (typeof v === 'string' && v.startsWith('#') && v.length === 7) {
      return v
    }
  } else if (props.option.type === 'radios') {
    if (typeof v === 'string') {
      if (props.option.options[v]) {
        return v
      }
    }
  } else if (props.option.type === 'checkbox') {
    if (typeof v === 'boolean') {
      return v ? '1' : '0'
    }
    return v === '1' ? '1' : '0'
  } else if (props.option.type === 'checkboxes') {
    const options = Object.keys(props.option.options || {})
    const items = Array.isArray(v)
      ? v
      : (typeof v === 'string' ? v : '').split(',')
    return items
      .filter((key) => {
        return options.includes(key)
      })
      .join(',')
  } else if (props.option.type === 'range' || props.option.type === 'number') {
    if (typeof v === 'number') {
      return v.toString()
    } else if (typeof v === 'string') {
      return v
    }
  }
}

const mutatedValue = computed<string | undefined>(() => {
  for (let i = 0; i < props.uuids.length; i++) {
    const uuid = props.uuids[i]
    const mutatedOptions = state.mutatedOptions[uuid]
    if (mutatedOptions) {
      const mutatedOption = state.mutatedOptions[uuid]?.[props.property]
      if (mutatedOption !== undefined) {
        return validateValue(mutatedOption)
      }
    }
  }
})

const defaultValue = computed<string>(
  () => validateValue(props.option.default) || '',
)

const value = computed<string>({
  get() {
    if (mutatedValue.value === undefined) {
      return defaultValue.value
    }
    return mutatedValue.value
  },
  set(value: string) {
    emit('update', value)
  },
})
</script>
