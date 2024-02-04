<template>
  <div
    v-if="availableOptions.length"
    class="bk-blokkli-item-options"
    @click="onClick"
    @mouseleave="onMouseLeave"
  >
    <OptionsFormItem
      v-for="plugin in visibleOptions"
      :key="plugin.property"
      :option="plugin.option"
      :property="plugin.property"
      :uuids="uuids"
      :bundle="itemBundle"
      class="bk-blokkli-item-options-item"
      :class="{
        'bk-is-disabled':
          !state.canEdit.value || state.editMode.value !== 'editing',
      }"
      @keydown.stop
      @update="setOptionValue(plugin.property, $event)"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onBeforeUnmount, onMounted } from '#imports'
import { globalOptions, getDefinition } from '#blokkli/definitions'
import { falsy } from '#blokkli/helpers'
import OptionsFormItem from './Item.vue'
import type { BlockDefinitionOptionsInput } from '#blokkli/types'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'
import { optionValueToStorable } from '#blokkli/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/helpers/runtimeHelpers'

const { adapter, eventBus, state, selection, runtimeConfig } = useBlokkli()

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

const definition = computed(() => getDefinition(props.itemBundle))

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
    return {
      property,
      option,
    }
  })
})

/**
 * The current mapped values, same as provided by defineBlokkli.
 */
const currentValues = computed(() => {
  const getOptionValue = (
    key: string,
    defaultValue: string | boolean | string[],
  ) => {
    const uuid = props.uuids[0]
    if (!uuid) {
      return ''
    }
    const blockMutatedOptions = state.mutatedOptions.value[uuid]
    if (
      blockMutatedOptions !== undefined &&
      blockMutatedOptions[key] !== undefined
    ) {
      return state.mutatedOptions.value[uuid][key]
    }
    return defaultValue
  }

  return availableOptions.value.reduce<
    Record<string, string | string[] | boolean>
  >((acc, v) => {
    acc[v.property] = getRuntimeOptionValue(
      v.option,
      getOptionValue(v.property, v.option.default),
    )
    return acc
  }, {})
})

const visibleOptions = computed(() => {
  if (!definition.value?.editor?.determineVisibleOptions) {
    return availableOptions.value
  }

  const renderedBlock = state.getRenderedBlock(props.uuids[0])

  const parentType =
    renderedBlock?.parentEntityType === runtimeConfig.itemEntityType
      ? renderedBlock.parentEntityBundle
      : undefined

  const ctxProps =
    renderedBlock?.item.bundle === 'from_library'
      ? (renderedBlock.item.props as any)?.libraryItem?.block?.props
      : renderedBlock?.item.props

  const visibleKeys: string[] =
    // We have to cast to any here because the types are guaranteed to be correct.
    definition.value?.editor!.determineVisibleOptions({
      options: currentValues.value as any,
      parentType: parentType as any,
      props: ctxProps as any,
    })

  return availableOptions.value.filter((v) => visibleKeys.includes(v.property))
})

function setOptionValue(key: string, value: string) {
  props.uuids.forEach((uuid) => {
    updated.set(uuid, key, value)

    if (!state.mutatedOptions.value[uuid]) {
      state.mutatedOptions.value[uuid] = {}
    }
    state.mutatedOptions.value[uuid][key] = value
    eventBus.emit('option:update', { uuid, key, value })
  })
}

onMounted(() => {
  props.uuids.forEach((uuid) => {
    availableOptions.value.forEach((option) => {
      original.set(
        uuid,
        option.property,
        optionValueToStorable(
          option.option,
          currentValues.value[option.property],
        ),
      )
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

  state.mutateWithLoadingState(adapter.updateOptions!(values))
})
</script>

<script lang="ts">
export default {
  name: 'OptionsForm',
}
</script>
