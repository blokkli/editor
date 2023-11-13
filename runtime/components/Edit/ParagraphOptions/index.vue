<template>
  <div
    v-if="availableOptions.length"
    class="pb-paragraph-options-item"
    v-for="plugin in availableOptions"
    :class="{ 'pb-is-disabled': !editingEnabled }"
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
} from './../../../types'
import { MutatedParagraphOptions } from '../types'

export type UpdateParagraphOptionEvent = {
  uuid: string
  key: string
  value: string
}

const emit = defineEmits<{
  (e: 'updateOption', data: UpdateParagraphOptionEvent): void
  (e: 'persistOptions', data: UpdateParagraphOptionEvent[]): void
}>()

const props = defineProps<{
  uuid: string
  paragraphType: string
  reusableBundle?: string
  reusableUuid?: string
  mutatedParagraphOptions: MutatedParagraphOptions
  editingEnabled: boolean
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
    props.mutatedParagraphOptions[props.uuid] &&
    props.mutatedParagraphOptions[props.uuid].paragraph_builder_data &&
    Object.prototype.hasOwnProperty.call(
      props.mutatedParagraphOptions[props.uuid].paragraph_builder_data,
      key,
    )
  ) {
    return props.mutatedParagraphOptions[props.uuid].paragraph_builder_data[key]
  }
  if (typeof defaultValue === 'boolean') {
    return defaultValue === true ? '1' : ''
  }
  return defaultValue
}

function setOptionValue(key: string, value: string) {
  collectedOptionUpdates.value[key] = value
  emit('updateOption', { uuid: props.uuid, key, value })
}

onBeforeUnmount(() => {
  emit(
    'persistOptions',
    Object.entries(collectedOptionUpdates.value).map(([key, value]) => {
      return {
        uuid: props.uuid,
        key,
        value,
      }
    }),
  )
})
</script>

<style></style>
