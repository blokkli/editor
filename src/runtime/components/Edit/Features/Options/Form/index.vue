<template>
  <div
    v-if="availableOptions.length"
    class="bk-blokkli-item-options"
    @click="onClick"
    @mouseleave="onMouseLeave"
  >
    <div
      v-for="plugin in visibleOptions"
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
        :value="plugin.value"
        :display-as="plugin.option.displayAs"
        @update="setOptionValue(plugin.property, $event)"
      />
      <OptionCheckbox
        v-else-if="plugin.option.type === 'checkbox'"
        :label="plugin.option.label"
        :value="plugin.value"
        @update="setOptionValue(plugin.property, $event)"
      />
      <OptionCheckboxes
        v-else-if="plugin.option.type === 'checkboxes'"
        :label="plugin.option.label"
        :options="plugin.option.options"
        :value="plugin.value"
        @update="setOptionValue(plugin.property, $event)"
      />
      <OptionText
        v-else-if="plugin.option.type === 'text'"
        :label="plugin.option.label"
        :type="plugin.option.inputType"
        :value="plugin.value"
        @update="setOptionValue(plugin.property, $event)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onBeforeUnmount, onMounted } from '#imports'
import { globalOptions, getDefinition } from '#blokkli/definitions'
import { falsy } from '#blokkli/helpers'
import OptionRadios from './Radios/index.vue'
import OptionCheckbox from './Checkbox/index.vue'
import OptionCheckboxes from './Checkboxes/index.vue'
import OptionText from './Text/index.vue'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
} from '#blokkli/types'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

const { adapter, eventBus, state, selection, runtimeConfig } = useBlokkli()
const { mutatedOptions, canEdit, mutateWithLoadingState, editMode } = state

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

const definition = computed<BlockDefinitionInput | undefined>(() => {
  return getDefinition(props.itemBundle) as BlockDefinitionInput
})

const availableOptions = computed(() => {
  if (!definition.value) {
    return []
  }
  const options = (definition.value.options ||
    {}) as BlockDefinitionOptionsInput
  const global = (
    (definition.value.globalOptions || []) as string[]
  ).reduce<BlockDefinitionOptionsInput>((acc, v) => {
    const globalDefinition: BlockOptionDefinition | null =
      (globalOptions as any)[v] || null
    if (globalDefinition) {
      acc[v] = globalDefinition
    }
    return acc
  }, {})

  return Object.entries({ ...options, ...global }).map(([property, option]) => {
    return { property, option, value: getOptionValue(property, option.default) }
  })
})

const visibleOptions = computed(() => {
  if (!definition.value?.editor?.determineVisibleOptions) {
    return availableOptions.value
  }

  const allOptions = availableOptions.value.reduce<Record<string, string>>(
    (acc, v) => {
      acc[v.property] = v.value
      return acc
    },
    {},
  )
  const renderedBlock = state.renderedBlocks.value.find(
    (v) => v.item.uuid === props.uuids[0],
  )

  const parentType =
    renderedBlock?.parentEntityType === runtimeConfig.itemEntityType
      ? renderedBlock.parentEntityBundle
      : undefined

  const visibleKeys: string[] =
    definition.value?.editor?.determineVisibleOptions({
      options: allOptions,
      parentType: parentType as any,
    })

  const visible = availableOptions.value.filter((v) =>
    visibleKeys.includes(v.property),
  )
  return visible
})

function getOptionValue(key: string, defaultValue: any, uuidOverride?: string) {
  const uuid = uuidOverride || props.uuids[0]
  if (!uuid) {
    return
  }
  const blockMutatedOptions = mutatedOptions.value[uuid]
  if (
    blockMutatedOptions &&
    Object.prototype.hasOwnProperty.call(blockMutatedOptions, key)
  ) {
    return mutatedOptions.value[uuid][key]
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
    mutatedOptions.value[uuid][key] = value
    eventBus.emit('option:update', { uuid, key, value })
  })
}

onMounted(() => {
  props.uuids.forEach((uuid) => {
    availableOptions.value.forEach((option) => {
      original.set(uuid, option.property, option.value)
    })
  })
})

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

  mutateWithLoadingState(adapter.updateOptions!(values))
})
</script>
