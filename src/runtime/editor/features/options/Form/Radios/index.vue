<template>
  <div
    class="bk-blokkli-item-options-radios"
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
      @mouseenter="onOptionMouseEnter(option)"
    >
      <div v-bind="getInputWrapperAttributes(option.value)">
        <input
          :id="option.key"
          type="radio"
          :name="property"
          :value="option.key"
          :checked="modelValue === option.key"
          @change="value = option.key"
        />
        <div
          v-if="
            displayAs === 'icons' &&
            typeof option.value === 'object' &&
            option.value.icon
          "
          class="bk-blokkli-item-options-radios-icon"
        >
          <Icon :name="option.value.icon as any" />
        </div>

        <div
          v-else-if="typeof option.value === 'object' && option.value.columns"
          class="bk-blokkli-item-options-radios-flex"
        >
          <div
            v-for="(v, i) in option.value.columns"
            :key="i"
            :style="{ flex: v }"
          />
        </div>
        <span
          v-else-if="
            typeof option.value === 'string' ||
            (typeof option.value === 'object' && displayAs === 'colors')
          "
        >
          {{
            typeof option.value === 'string' ? option.value : option.value.label
          }}
        </span>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted } from '#imports'
import { Icon } from '#blokkli/editor/components'
import { defineCommands } from '#blokkli/editor/composables'

const { $t, state } = useBlokkli()

type PossibleOptionType =
  | string
  | {
      hex?: string
      class?: string
      columns?: number[]
      icon?: string
      label: string
      description?: string
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

const mappedOptions = computed(() => {
  return Object.entries(props.options).map(([key, value]) => {
    const label = typeof value === 'string' ? value : value.label
    const description = typeof value === 'object' ? value.description || '' : ''
    return { key, value, label, description }
  })
})

const selectedOption = computed(() => {
  return mappedOptions.value.find((v) => v.key === value.value)
})

const isDefaultRadios = computed(
  () => props.displayAs === 'radios' || !props.displayAs,
)

function onOptionMouseEnter(option: (typeof mappedOptions.value)[number]) {
  if (!isDefaultRadios.value) {
    active.value = option.label
  }
  activeDescription.value = option.description
}

function onMouseLeave() {
  if (!isDefaultRadios.value) {
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
  if (!isDefaultRadios.value) {
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
