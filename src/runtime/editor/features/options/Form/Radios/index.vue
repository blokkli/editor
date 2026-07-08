<template>
  <div
    class="bk-blokkli-item-options-radios"
    data-test="option-type-radios"
    :class="{
      'bk-is-color': displayAs === 'colors',
      'bk-is-grid': displayAs === 'grid',
      'bk-is-icons': displayAs === 'icons',
    }"
    @mouseleave="onMouseLeave"
  >
    <label
      v-for="option in mappedOptions"
      :key="option.key"
      data-test="radios-option"
      :data-test-value="option.key"
      @mouseenter="onOptionMouseEnter(option)"
    >
      <div
        v-bind="getInputWrapperAttributes(option.value)"
        :data-test="displayAs === 'colors' ? 'radios-swatch' : undefined"
        :data-test-value="displayAs === 'colors' ? option.key : undefined"
      >
        <input
          :id="option.key"
          type="radio"
          :name="property"
          :value="option.key"
          :checked="modelValue === option.key"
          data-test="radios-input"
          :data-test-value="option.key"
          @change="value = option.key"
        />
        <div
          v-if="
            displayAs === 'icons' &&
            typeof option.value === 'object' &&
            option.value.icon
          "
          class="bk-blokkli-item-options-radios-icon"
          data-test="radios-icon"
          :data-test-value="option.key"
        >
          <Icon :name="option.value.icon as any" data-test="radios-icon-svg" />
        </div>

        <div
          v-else-if="typeof option.value === 'object' && option.value.columns"
          class="bk-blokkli-item-options-radios-flex"
          data-test="radios-grid"
          :data-test-value="option.key"
        >
          <div
            v-for="(v, i) in option.value.columns"
            :key="i"
            :style="{ flex: v }"
            data-test="radios-grid-cell"
            :data-test-flex="v"
          />
        </div>
        <span v-else data-test="radios-label" :data-test-value="option.key">
          {{ typeof option.value === 'string' ? option.value : option.label }}
        </span>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { defineCommands } from '#blokkli/editor/composables'
import type { DefinitionString } from '../../../../../../global/types/blockOptions'

const { $t, state, definitions } = useBlokkli()

type PossibleOptionType =
  | string
  | {
      hex?: string
      class?: string
      columns?: number[]
      icon?: string
      label: DefinitionString
      description?: DefinitionString
    }

const props = defineProps<{
  label: string
  property: string
  displayAs?: 'radios' | 'colors' | 'grid' | 'icons'
  options: Record<string, PossibleOptionType>
}>()

const value = defineModel<string>({
  default: '',
})

const active = defineModel<string>('hovered', {
  default: '',
})

const activeDescription = defineModel<string>('hoveredDescription', {
  default: '',
})

function getInputWrapperAttributes(value: PossibleOptionType) {
  if (props.displayAs === 'colors' && typeof value !== 'string') {
    if (value.hex && value.hex.indexOf('#') === 0) {
      return {
        style: 'background-color: ' + value.hex,
      }
    } else if (value.class) {
      return {
        class: value.class,
      }
    }
  }
  return {}
}

const mappedOptions = computed<
  {
    key: string
    value: PossibleOptionType
    label: string
    description: string
  }[]
>(() => {
  return Object.entries(props.options).map(([key, value]) => {
    const label = typeof value === 'string' ? value : value.label
    const description = typeof value === 'object' ? value.description || '' : ''
    return {
      key,
      value,
      label: definitions.resolveDefinitionString(label),
      description: definitions.resolveDefinitionString(description),
    }
  })
})

const selectedOption = computed(() => {
  return mappedOptions.value.find((v) => v.key === value.value)
})

const isDefaultRadios = computed(
  () => props.displayAs === 'radios' || !props.displayAs,
)

function onOptionMouseEnter(option: (typeof mappedOptions.value)[number]) {
  if (!isDefaultRadios.value || option.description) {
    active.value = option.label
  }
  activeDescription.value = option.description
}

function onMouseLeave() {
  if (!isDefaultRadios.value || selectedOption.value?.description) {
    active.value = selectedOption.value?.label ?? ''
  }
  activeDescription.value = selectedOption.value?.description ?? ''
}

defineCommands(() => {
  if (state.editMode.value !== 'editing') {
    return
  }
  return mappedOptions.value
    .filter((v) => v.key !== value.value)
    .map((option) => {
      return {
        id: 'options:' + props.property + option.key,
        label: $t(
          'optionsCommand.setOption',
          'Set option "@option" to "@value"',
        )
          .replace('@option', props.label)
          .replace('@value', option.key),
        group: 'selection',
        icon: 'bk_mdi_radio_button_checked',
        callback: () => {
          value.value = option.key
        },
      }
    })
})

onMounted(() => {
  if (!isDefaultRadios.value || selectedOption.value?.description) {
    active.value = selectedOption.value?.label ?? ''
  }
  activeDescription.value = selectedOption.value?.description ?? ''
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormRadios',
}
</script>
