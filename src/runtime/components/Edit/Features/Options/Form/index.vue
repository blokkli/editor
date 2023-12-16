<template>
  <div
    class="bk-blokkli-item-options"
    @click="onClick"
    @mouseleave="onMouseLeave"
  >
    <div
      v-for="plugin in availableOptions"
      :key="plugin.property"
      class="bk-blokkli-item-options-item"
      :class="{ 'bk-is-disabled': !canEdit || editMode !== 'editing' }"
      @keydown.stop
    >
      <div class="bk-tooltip">
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
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onBeforeUnmount } from '#imports'

import { globalOptions, getDefinition } from '#blokkli/definitions'
import OptionRadios from './Radios/index.vue'
import OptionCheckbox from './Checkbox/index.vue'
import OptionCheckboxes from './Checkboxes/index.vue'
import OptionText from './Text/index.vue'
import type { BlokkliItemDefinitionOptionsInput } from '#blokkli/types'
import type { BlokkliDefinitionOption } from '#blokkli/types/blokkOptions'

import { falsy } from '#blokkli/helpers'

const { adapter, eventBus, state, runtimeConfig, selection } = useBlokkli()
const { mutatedOptions, canEdit, mutateWithLoadingState, editMode } = state

const pluginId = runtimeConfig.optionsPluginId

const onClick = () => {
  selection.isChangingOptions.value = true
}

const onMouseLeave = () => {
  selection.isChangingOptions.value = false
}

const props = defineProps<{
  uuids: string[]
  itemBundle: string
}>()

class OptionCollector {
  options: Record<string, Record<string, string>>

  constructor() {
    this.options = {}
  }

  set(uuid: string, key: string, value: string): void {
    if (!this.options[uuid]) {
      this.options[uuid] = {}
    }

    this.options[uuid][key] = value
  }

  get(uuid: string, key: string): string | undefined {
    return this.options[uuid]?.[key]
  }

  getEntries() {
    return Object.entries(this.options)
      .map(([uuid, options]) => {
        return Object.entries(options).map(([key, value]) => {
          return {
            uuid,
            key,
            value,
          }
        })
      })
      .flat()
  }
}

const original = new OptionCollector()
const updated = new OptionCollector()

const availableOptions = computed(() => {
  const definition = getDefinition(props.itemBundle)
  if (!definition) {
    return []
  }
  const options = definition.options || {}
  const global = (
    (definition.globalOptions || []) as string[]
  ).reduce<BlokkliItemDefinitionOptionsInput>((acc, v) => {
    const globalDefinition: BlokkliDefinitionOption | null =
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

function getOptionValue(key: string, defaultValue: any, uuidOverride?: string) {
  const uuid = uuidOverride || props.uuids[0]
  if (!uuid) {
    return
  }
  if (
    mutatedOptions.value[uuid] &&
    mutatedOptions.value[uuid][pluginId] &&
    Object.prototype.hasOwnProperty.call(
      mutatedOptions.value[uuid][pluginId],
      key,
    )
  ) {
    return mutatedOptions.value[uuid][pluginId][key]
  }
  if (typeof defaultValue === 'boolean') {
    return defaultValue === true ? '1' : ''
  }
  return defaultValue
}

function setOptionValue(key: string, value: string) {
  props.uuids.forEach((uuid) => {
    // First time changing an option value store it in this ref.
    if (original.get(uuid, key) === undefined) {
      original.set(uuid, key, getOptionValue(key, null, uuid))
    }

    updated.set(uuid, key, value)

    if (!mutatedOptions.value[uuid]) {
      mutatedOptions.value[uuid] = {}
    }
    if (!mutatedOptions.value[uuid][pluginId]) {
      mutatedOptions.value[uuid][pluginId] = {}
    }
    mutatedOptions.value[uuid][pluginId][key] = value
    eventBus.emit('option:update', { uuid, key, value })
  })
}

onBeforeUnmount(() => {
  selection.isChangingOptions.value = false
  const values = updated
    .getEntries()
    .map((entry) => {
      // Check if the original value is the same as the updated value.
      // If yes, we can skip updating it, since it's the same.
      const originalValue = original.get(entry.uuid, entry.key)
      if (originalValue === entry.value) {
        return
      }
      return entry
    })
    .filter(falsy)

  if (!values.length) {
    return
  }

  mutateWithLoadingState(adapter.updateOptions(values))
})
</script>
