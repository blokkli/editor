<template>
  <div
    v-if="availableOptions.length"
    class="pb-paragraph-options-item"
    v-for="plugin in availableOptions"
    :class="{ 'pb-is-disabled': !canEdit }"
    @keydown.stop
  >
    <div class="pb-tooltip">
      <span>{{ plugin.option.label }}</span>
    </div>
    <OptionRadios
      v-if="plugin.option.type === 'radios'"
      :options="plugin.option.options"
      :name="plugin.property"
      :value="getOptionValue(plugin.property, plugin.option.default)"
      :display-as="plugin.option.displayAs"
      @update="setOptionValue(plugin.property, $event)"
    />
    <OptionCheckbox
      v-else-if="plugin.option.type === 'checkbox'"
      :label="plugin.option.label"
      :value="getOptionValue(plugin.property, plugin.option.default)"
      @update="setOptionValue(plugin.property, $event)"
    />
    <OptionCheckboxes
      v-else-if="plugin.option.type === 'checkboxes'"
      :label="plugin.option.label"
      :options="plugin.option.options"
      :value="getOptionValue(plugin.property, plugin.option.default)"
      @update="setOptionValue(plugin.property, $event)"
    />
    <OptionText
      v-else-if="plugin.option.type === 'text'"
      :label="plugin.option.label"
      :type="plugin.option.inputType"
      :value="getOptionValue(plugin.property, plugin.option.default)"
      @update="setOptionValue(plugin.property, $event)"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  definitions,
  globalOptions,
} from '#nuxt-paragraphs-builder/definitions'
import OptionRadios from './Radios/index.vue'
import OptionCheckbox from './Checkbox/index.vue'
import OptionCheckboxes from './Checkboxes/index.vue'
import OptionText from './Text/index.vue'
import {
  ParagraphDefinitionOption,
  ParagraphDefinitionOptionsInput,
} from './../../../../../types'
import { falsy } from '../../../helpers'

const { mutatedOptions, canEdit, adapter, mutateWithLoadingState } =
  useParagraphsBuilderStore()

const props = defineProps<{
  uuid: string
  reusableBundle?: string
  paragraphType: string
}>()

const collectedOptionUpdates = ref<Record<string, string>>({})

const availableOptions = computed(() => {
  const actualBundle = props.reusableBundle || props.paragraphType
  const definition = definitions.find((v) => v.bundle === actualBundle)
  if (!definition) {
    return []
  }
  const options = definition.options || {}
  const global = (
    (definition.globalOptions || []) as string[]
  ).reduce<ParagraphDefinitionOptionsInput>((acc, v) => {
    const globalDefinition: ParagraphDefinitionOption | null =
      (globalOptions as any)[v] || null
    if (globalDefinition) {
      acc[v] = globalDefinition
    }
    return acc
  }, {})

  return Object.entries({ ...options, ...global }).map(([property, option]) => {
    return { property, option }
  })
})

function getOptionValue(key: string, defaultValue: any) {
  if (
    mutatedOptions.value[props.uuid] &&
    mutatedOptions.value[props.uuid].paragraph_builder_data &&
    Object.prototype.hasOwnProperty.call(
      mutatedOptions.value[props.uuid].paragraph_builder_data,
      key,
    )
  ) {
    return mutatedOptions.value[props.uuid].paragraph_builder_data[key]
  }
  if (typeof defaultValue === 'boolean') {
    return defaultValue === true ? '1' : ''
  }
  return defaultValue
}

function setOptionValue(key: string, value: string) {
  collectedOptionUpdates.value[key] = value
  if (!mutatedOptions.value[props.uuid]) {
    mutatedOptions.value[props.uuid] = {}
  }
  if (!mutatedOptions.value[props.uuid].paragraph_builder_data) {
    mutatedOptions.value[props.uuid].paragraph_builder_data = {}
  }
  mutatedOptions.value[props.uuid].paragraph_builder_data[key] = value
}

onBeforeUnmount(() => {
  const values = Object.entries(collectedOptionUpdates.value)
    .map(([key, value]) => {
      return {
        uuid: props.uuid,
        key,
        value,
      }
    })
    .filter(falsy)

  if (!values.length) {
    return
  }

  mutateWithLoadingState(adapter.updateParagraphOptions(values))
})
</script>
