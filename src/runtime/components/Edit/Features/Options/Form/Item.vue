<template>
  <div class="bk-blokkli-item-options-item" @keydown.stop>
    <div
      v-if="showLabel"
      :class="isGrouped ? 'bk-blokkli-item-options-item-label' : 'bk-tooltip'"
    >
      <span>{{ label }}</span>
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
        :label="label"
        :options="option.options"
        :property="property"
        :display-as="option.displayAs"
      />
      <OptionCheckbox
        v-else-if="option.type === 'checkbox'"
        v-model="value"
        :property="property"
        :label="label"
        :value="value"
      />
      <OptionCheckboxes
        v-else-if="option.type === 'checkboxes'"
        v-model="value"
        :property="property"
        :label="label"
        :options="checkboxOptions"
        :value="value"
        :is-grouped="isGrouped"
      />
      <OptionText
        v-else-if="option.type === 'text'"
        v-model="value"
        :label="label"
        :type="option.inputType"
      />
      <OptionColor
        v-else-if="option.type === 'color'"
        v-model="value"
        :label="label"
      />
      <OptionRange
        v-else-if="option.type === 'range'"
        v-model="value"
        :label="label"
        :min="option.min"
        :max="option.max"
        :step="option.step"
      />
      <OptionNumber
        v-else-if="option.type === 'number'"
        v-model="value"
        :label="label"
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

const { state, $t: $blokkliText } = useBlokkli()

const emit = defineEmits<{
  (e: 'update', data: string): void
}>()

const props = defineProps<{
  option: BlockOptionDefinition
  property: string
  mutatedValue: any
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

const label = computed(() =>
  $blokkliText(`blockOption_${props.property}_label`, props.option.label),
)

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

const value = computed<string | undefined>({
  get() {
    return validateValue(props.mutatedValue)
  },
  set(value: string | undefined) {
    emit('update', value === undefined ? '' : value)
  },
})
</script>
