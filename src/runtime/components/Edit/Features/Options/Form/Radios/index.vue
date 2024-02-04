<template>
  <div
    class="bk-blokkli-item-options-radios"
    :class="{
      'bk-is-color': displayAs === 'colors',
      'bk-is-grid': displayAs === 'grid',
      'bk-is-icons': displayAs === 'icons',
    }"
  >
    <label v-for="option in mappedOptions" :key="option.key">
      <div v-bind="getInputWrapperAttributes(option.value)">
        <input
          :id="option.key"
          type="radio"
          :name="property"
          :value="option.key"
          :checked="modelValue === option.key"
          @change="$emit('update:modelValue', option.key)"
        />
        <div
          v-if="displayAs === 'icons'"
          class="bk-blokkli-item-options-radios-icon"
        >
          <Icon :name="option.value as any" />
        </div>
        <span v-else-if="typeof option.value === 'string'" class="bk-is-text">
          {{ option.value }}
        </span>
        <div v-else class="bk-blokkli-item-options-radios-flex">
          <div v-for="(v, i) in option.value" :key="i" :style="{ flex: v }" />
        </div>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import defineCommands from '#blokkli/helpers/composables/defineCommands'

const { $t } = useBlokkli()

const props = defineProps<{
  label: string
  property: string
  displayAs?: 'radios' | 'colors' | 'grid' | 'icons'
  options: Record<string, string | number[]>
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

function getInputWrapperAttributes(value: string | number[]) {
  if (props.displayAs === 'colors' && typeof value === 'string') {
    if (value.indexOf('#') === 0) {
      return {
        style: 'background-color: ' + value,
      }
    }
    return {
      class: value,
    }
  }
  return {}
}

const mappedOptions = computed(() => {
  return Object.entries(props.options).map(([key, value]) => {
    return { key, value }
  })
})

const setValue = (value: string) => {
  emit('update:modelValue', value)
}

defineCommands(() => {
  return mappedOptions.value
    .filter((v) => v.key !== props.modelValue)
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
        callback: () => setValue(option.key),
      }
    })
})
</script>

<script lang="ts">
export default {
  name: 'OptionsFormRadios',
}
</script>
