<template>
  <div
    class="bk-blokkli-item-options-radios"
    @mouseleave="onMouseLeave"
    :class="{
      'bk-is-color': displayAs === 'colors',
      'bk-is-grid': displayAs === 'grid',
      'bk-is-icons': displayAs === 'icons',
    }"
  >
    <label
      v-for="option in mappedOptions"
      :key="option.key"
      @mouseenter="active = option.label"
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
import { Icon } from '#blokkli/components'
import defineCommands from '#blokkli/helpers/composables/defineCommands'

const { $t, state } = useBlokkli()

type PossibleOptionType =
  | string
  | {
      hex?: string
      class?: string
      columns?: number[]
      icon?: string
      label: string
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
    return { key, value, label }
  })
})

const selectedLabel = computed(() => {
  return mappedOptions.value.find((v) => v.key === value.value)?.label
})

function onMouseLeave() {
  active.value = selectedLabel.value ?? ''
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
        icon: 'form',
        callback: () => {
          value.value = option.key
        },
      }
    })
})

onMounted(() => {
  active.value = selectedLabel.value ?? ''
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormRadios',
}
</script>
