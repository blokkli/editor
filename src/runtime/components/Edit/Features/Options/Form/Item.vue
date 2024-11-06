<template>
  <div class="bk-blokkli-item-options-item" @keydown.stop>
    <div
      v-if="showLabel"
      :class="isGrouped ? 'bk-blokkli-item-options-item-label' : 'bk-tooltip'"
    >
      <span>{{ option.label }}</span>
    </div>
    <div
      class="bk-blokkli-item-options-item-content"
      :class="{
        'bk-is-grouped': isGrouped,
      }"
    >
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
        :options="checkboxOptions"
        :value="value"
        :is-grouped="isGrouped"
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
import { mapCheckboxTrue } from '#blokkli/helpers/runtimeHelpers'
import { BK_VISIBLE_LANGUAGES } from '#blokkli/helpers/symbols'

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

const showLabel = computed(() => {
  if (props.isGrouped) {
    if (props.option.type === 'checkbox') {
      return false
    }
  }

  return true
})

const checkboxOptions = computed<{ value: string; label: string }[]>(() => {
  if (props.option.type !== 'checkboxes') {
    return []
  }

  if (props.property === BK_VISIBLE_LANGUAGES) {
    return (state.translation.value.availableLanguages || []).map(
      (language) => {
        return {
          value: language.id,
          label: language.name,
        }
      },
    )
  }

  return Object.entries(props.option.options).map(([value, label]) => {
    return {
      value,
      label,
    }
  })
})

const validCheckboxValues = computed(() =>
  checkboxOptions.value.map((v) => v.value),
)

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
  } else if (props.option.type === 'radios' && typeof v === 'string') {
    if (props.option.options[v]) {
      return v
    }
  } else if (props.option.type === 'checkbox') {
    return mapCheckboxTrue(v)
  } else if (props.option.type === 'checkboxes') {
    const items = Array.isArray(v)
      ? v
      : (typeof v === 'string' ? v : '').split(',')
    return items
      .filter((key) => {
        return validCheckboxValues.value.includes(key)
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

  return undefined
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
