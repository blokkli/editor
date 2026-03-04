<template>
  <div
    v-if="availableOptions.length"
    class="bk-blokkli-item-options"
    @pointerup="onPointerUp"
  >
    <OptionsFormItem
      v-for="plugin in singleVisibleOptions"
      :key="plugin.property"
      :option="plugin.option"
      :property="plugin.property"
      :mutated-value="currentValues[plugin.property]"
      :uuid="firstUuid"
      class="bk-blokkli-item-options-item"
      :class="{
        'bk-is-disabled': isDisabled(plugin),
      }"
      @keydown.stop
      @update="setOptionValue(plugin.property, $event)"
    />

    <OptionsFormGroup
      v-for="group in optionGroups"
      :key="'group_' + group.label"
      :label="group.label"
      :is-active="group.label === activeGroup"
      @toggle="onToggleGroup(group.label)"
    >
      <OptionsFormItem
        v-for="plugin in group.options"
        :key="plugin.property"
        :option="plugin.option"
        :property="plugin.property"
        :mutated-value="currentValues[plugin.property]"
        :uuid="firstUuid"
        class="bk-blokkli-item-options-item"
        :class="{
          'bk-is-disabled': isDisabled(plugin),
        }"
        is-grouped
        @keydown.stop
        @update="setOptionValue(plugin.property, $event)"
      />
    </OptionsFormGroup>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onBeforeUnmount, onMounted } from '#imports'
import { falsy, onlyUnique } from '#blokkli/helpers'
import OptionsFormItem from './Item.vue'
import OptionsFormGroup from './Group.vue'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  FragmentDefinitionInput,
  ProviderDefinitionInput,
} from '#blokkli/types/definitions'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'
import {
  BK_HIDDEN_GLOBALLY,
  BK_VISIBLE_LANGUAGES,
} from './../../../../../global/constants'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'
import {
  getAvailableOptions,
  getMutatedOptionValue,
  optionValueToStorable,
  type OptionItem,
} from '#blokkli/editor/helpers/options'

if (import.meta.hot) {
  import.meta.hot.accept('#blokkli/runtime-helpers', () => {})
}

type OptionGroup = {
  label: string
  options: OptionItem[]
}

const activeGroup = ref('')

function onToggleGroup(label: string) {
  if (activeGroup.value === label) {
    activeGroup.value = ''
  } else {
    activeGroup.value = label
  }
}

const {
  adapter,
  eventBus,
  state,
  selection,
  dom,
  theme,
  context,
  definitions,
  blocks,
  ui,
} = useBlokkli()

const props = defineProps<{
  uuids: string[] | 'provider'
  definition:
    | BlockDefinitionInput
    | FragmentDefinitionInput
    | ProviderDefinitionInput
}>()

const firstUuid = computed(() =>
  Array.isArray(props.uuids) ? props.uuids[0] : undefined,
)

let pointerTimeout: null | number = null

function onPointerUp(e: PointerEvent) {
  if (pointerTimeout) {
    clearTimeout(pointerTimeout)
  }
  ui.actionsToolbarLocked.value = true
  ui.isChangingOptions.value = true

  if (e.pointerType === 'touch') {
    pointerTimeout = window.setTimeout(() => {
      stopChangingOptions()
    }, 2000)
  }
}

function stopChangingOptions() {
  if (pointerTimeout) {
    clearTimeout(pointerTimeout)
  }
  if (!ui.isChangingOptions.value) {
    return
  }

  if (Array.isArray(props.uuids)) {
    // Refresh the rects of the blocks because they might have changed.
    props.uuids.forEach((uuid) => {
      dom.refreshBlockRect(uuid)
      const block = blocks.getBlock(uuid)
      if (block) {
        const el = dom.getDragElement(block)
        if (el) {
          theme.invalidateCachedStyle(el)
        }
      }
    })
  }
  ui.actionsToolbarLocked.value = false
  ui.isChangingOptions.value = false
  eventBus.emit('option:finish-change')
}

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

const availableOptions = computed<OptionItem[]>(() => {
  if (!props.definition) {
    return []
  }
  return getAvailableOptions(
    props.definition.options as BlockDefinitionOptionsInput | undefined,
    props.definition.globalOptions as string[] | undefined,
    definitions.globalOptions.value as Record<string, any>,
  )
})

function getOptionValue(
  uuid: string,
  key: string,
  defaultValue: string | boolean | string[] | number | undefined,
) {
  return getMutatedOptionValue(state.mutatedOptions, uuid, key, defaultValue)
}

/**
 * The current mapped values, same as provided by defineBlokkli.
 */
const currentValues = computed(() => {
  return availableOptions.value.reduce<
    Record<string, string | string[] | boolean | number>
  >((acc, v) => {
    if (Array.isArray(props.uuids)) {
      // Get all current values.
      const values = props.uuids
        .map((uuid) => {
          return JSON.stringify(
            getRuntimeOptionValue(
              v.option,
              getOptionValue(uuid, v.property, v.option.default),
            ),
          )
        })
        .filter(onlyUnique)

      if (values.length === 1) {
        acc[v.property] = getRuntimeOptionValue(
          v.option,
          getOptionValue(props.uuids[0]!, v.property, v.option.default),
        )
      } else {
        acc[v.property] = ''
      }
    } else {
      acc[v.property] = getRuntimeOptionValue(
        v.option,
        getOptionValue('HOST', v.property, v.option.default),
      )
    }

    return acc
  }, {})
})

function filterInternal(item: OptionItem) {
  if (currentValues.value[BK_HIDDEN_GLOBALLY]) {
    return item.property !== BK_VISIBLE_LANGUAGES
  }

  return true
}

function isInternalOption(property: string) {
  return property === BK_VISIBLE_LANGUAGES || property === BK_HIDDEN_GLOBALLY
}

const visibleOptions = computed<OptionItem[]>(() => {
  if (
    !('editor' in props.definition) ||
    !props.definition.editor?.determineVisibleOptions
  ) {
    return availableOptions.value.filter(filterInternal)
  }

  const uuid = props.uuids[0]!
  const item = state.getFieldListItem(uuid)
  const block = selection.items.value.find((v) => v.uuid === uuid)
  if (!item) {
    return []
  }

  const parentType =
    block?.host.type === itemEntityType ? block.parentBlockBundle : undefined

  const ctxProps =
    item?.bundle === fromLibraryBlockBundle
      ? (item?.props as any)?.libraryItem?.block?.props
      : item?.props

  const visibleKeys =
    // We have to cast to any here because the types are guaranteed to be correct.
    props.definition.editor!.determineVisibleOptions({
      options: currentValues.value as any,
      parentType: parentType as any,
      props: ctxProps as any,
      entity: context.value,
      fieldListType: block?.fieldListType ?? 'default',
    })

  return availableOptions.value
    .filter(
      (v) => isInternalOption(v.property) || visibleKeys.includes(v.property),
    )
    .filter(filterInternal)
})

function isDisabled(plugin: OptionItem) {
  if (!state.canEdit.value || state.editMode.value === 'readonly') {
    return true
  }

  if (isInternalOption(plugin.property)) {
    return false
  }

  return state.editMode.value !== 'editing'
}

const singleVisibleOptions = computed(() =>
  visibleOptions.value.filter((v) => !v.option.group),
)

const optionGroups = computed<OptionGroup[]>(() => {
  return Object.values(
    visibleOptions.value.reduce<Record<string, OptionGroup>>((acc, option) => {
      if (option.option.group) {
        if (!acc[option.option.group]) {
          acc[option.option.group] = {
            label: option.option.group,
            options: [option],
          }
        } else {
          acc[option.option.group]!.options.push(option)
        }
      }
      return acc
    }, {}),
  )
})

function setOptionValue(key: string, value: unknown) {
  const optionDef = availableOptions.value.find((o) => o.property === key)
  const storable = optionDef
    ? optionValueToStorable(
        optionDef.option,
        value as string | string[] | boolean | number | null | undefined,
      )
    : String(value)

  if (Array.isArray(props.uuids)) {
    props.uuids.forEach((uuid) => {
      updated.set(uuid, key, storable)

      if (!state.mutatedOptions[uuid]) {
        state.mutatedOptions[uuid] = {}
      }
      state.mutatedOptions[uuid][key] = storable
      eventBus.emit('option:update', { uuid, key, value: storable })
    })
  } else {
    updated.set('HOST', key, storable)
    if (!state.mutatedOptions.HOST) {
      state.mutatedOptions.HOST = {}
    }
    state.mutatedOptions.HOST[key] = storable
  }
}

onMounted(() => {
  if (Array.isArray(props.uuids)) {
    props.uuids.forEach((uuid) => {
      availableOptions.value.forEach((option) => {
        const currentValue = getOptionValue(
          uuid,
          option.property,
          option.option.default,
        )
        original.set(
          uuid,
          option.property,
          optionValueToStorable(option.option, currentValue),
        )
      })
    })
  } else {
    availableOptions.value.forEach((option) => {
      const currentValue = getOptionValue(
        'HOST',
        option.property,
        option.option.default,
      )
      original.set(
        'HOST',
        option.property,
        optionValueToStorable(option.option, currentValue),
      )
    })
  }
})

onBeforeUnmount(() => {
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

  if (Array.isArray(props.uuids)) {
    state.mutateWithLoadingState(() => adapter.updateOptions!(values))
  } else {
    state.mutateWithLoadingState(() =>
      adapter.updateHostOptions!(
        values.map((v) => {
          return {
            ...v,
            uuid: undefined,
          }
        }),
      ),
    )
  }
})
</script>

<script lang="ts">
export default {
  name: 'OptionsForm',
}
</script>
