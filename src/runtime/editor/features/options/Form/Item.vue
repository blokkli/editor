<template>
  <div class="bk-blokkli-item-options-item group/tooltip" @keydown.stop>
    <Tooltip
      :label
      :description
      :placement="isGrouped ? 'inline' : 'above-left'"
      class="!whitespace-normal"
      :class="{
        'w-full px-10 pt-10': isGrouped,
        'min-w-full w-max max-w-300': !isGrouped,
      }"
    >
      <template #status>
        <TooltipContext
          v-if="hoveredOption"
          :label="hoveredOption"
          :description="hoveredOptionDescription"
        />
      </template>
    </Tooltip>
    <div
      class="bk-blokkli-item-options-item-content"
      :class="{
        'bk-is-grouped': isGrouped,
      }"
    >
      <OptionRadios
        v-if="option.type === 'radios'"
        v-model="value"
        v-model:hovered="hoveredOption"
        v-model:hovered-description="hoveredOptionDescription"
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
        :nullable="option.nullable"
      />
      <OptionDateTimeLocal
        v-else-if="option.type === 'datetime-local'"
        v-model="value"
        :label="label"
        :min="option.min"
        :max="option.max"
      />
      <OptionComplexType
        v-else-if="option.type === 'json' && option.dataType && uuid"
        :uuid="uuid"
        :property="property"
        :data-type="option.dataType"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'
import OptionRadios from './Radios/index.vue'
import OptionCheckbox from './Checkbox/index.vue'
import OptionCheckboxes from './Checkboxes/index.vue'
import OptionText from './Text/index.vue'
import OptionColor from './Color/index.vue'
import OptionRange from './Range/index.vue'
import OptionNumber from './Number/index.vue'
import OptionDateTimeLocal from './DateTimeLocal/index.vue'
import OptionComplexType from './ComplexType/index.vue'
import { Tooltip, TooltipContext } from '#blokkli/editor/components'
import type { BlockOptionDefinitionBase } from './../../../../../global/types/blockOptions'
import { BK_VISIBLE_LANGUAGES } from './../../../../../global/constants'

const { state, $t: $blokkliText } = useBlokkli()

const emit = defineEmits<{
  (e: 'update', data: unknown): void
}>()

const props = defineProps<{
  option: BlockOptionDefinitionBase
  property: string
  mutatedValue: any
  isGrouped?: boolean
  uuid?: string
}>()

const hoveredOption = ref('')
const hoveredOptionDescription = ref('')

const label = computed(() =>
  $blokkliText(`blockOption_${props.property}_label`, props.option.label),
)

const description = computed<string | null>(() => {
  if (!props.option.description) {
    return null
  }
  const key = `blockOption_${props.property}_description`
  const translation = $blokkliText(key, props.option.description)
  if (key === translation) {
    return null
  }

  return translation
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

const value = computed({
  get() {
    return props.mutatedValue
  },
  set(v: unknown) {
    emit('update', v)
  },
})
</script>
