<template>
  <div
    v-if="availableOptions.length"
    class="bk-blokkli-item-options"
    @pointerup="onPointerUp"
    @mouseleave="stopChangingOptions"
  >
    <OptionsFormItem
      v-for="plugin in singleVisibleOptions"
      :key="plugin.property"
      :option="plugin.option"
      :property="plugin.property"
      :uuids="uuids"
      class="bk-blokkli-item-options-item"
      :class="{
        'bk-is-disabled':
          !state.canEdit.value || state.editMode.value !== 'editing',
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
        :uuids="uuids"
        class="bk-blokkli-item-options-item"
        :class="{
          'bk-is-disabled':
            !state.canEdit.value || state.editMode.value !== 'editing',
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
import { globalOptions } from '#blokkli/definitions'
import { falsy } from '#blokkli/helpers'
import OptionsFormItem from './Item.vue'
import OptionsFormGroup from './Group.vue'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  FragmentDefinitionInput,
} from '#blokkli/types'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'
import { optionValueToStorable } from '#blokkli/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/helpers/runtimeHelpers'

type OptionItem = {
  property: string
  option: BlockOptionDefinition
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
  runtimeConfig,
  dom,
  theme,
  context,
} = useBlokkli()

const props = defineProps<{
  uuids: string[]
  definition: BlockDefinitionInput | FragmentDefinitionInput
}>()

let pointerTimeout: null | number = null

function onPointerUp(e: PointerEvent) {
  if (pointerTimeout) {
    clearTimeout(pointerTimeout)
  }
  selection.isChangingOptions.value = true

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
  if (!selection.isChangingOptions.value) {
    return
  }

  // Refresh the rects of the blocks because they might have changed.
  props.uuids.forEach((uuid) => {
    dom.refreshBlockRect(uuid)
    const block = dom.findBlock(uuid)
    if (block) {
      const el = dom.getDragElement(block)
      if (el) {
        theme.invalidateCachedStyle(el)
      }
    }
  })
  selection.isChangingOptions.value = false
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
  const options = (props.definition.options ||
    {}) as BlockDefinitionOptionsInput
  const global = (
    (props.definition.globalOptions || []) as string[]
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
    defaultValue: string | boolean | string[] | number,
  ) => {
    const uuid = props.uuids[0]
    if (!uuid) {
      return ''
    }
    const blockMutatedOptions = state.mutatedOptions[uuid]
    if (
      blockMutatedOptions !== undefined &&
      blockMutatedOptions[key] !== undefined
    ) {
      return state.mutatedOptions[uuid][key]
    }
    return defaultValue
  }

  return availableOptions.value.reduce<
    Record<string, string | string[] | boolean | number>
  >((acc, v) => {
    acc[v.property] = getRuntimeOptionValue(
      v.option,
      getOptionValue(v.property, v.option.default),
    )
    return acc
  }, {})
})

const visibleOptions = computed<OptionItem[]>(() => {
  if (!props.definition.editor?.determineVisibleOptions) {
    return availableOptions.value
  }

  const uuid = props.uuids[0]
  const item = state.getFieldListItem(props.uuids[0])
  const block = selection.blocks.value.find((v) => v.uuid === uuid)
  if (!item) {
    return []
  }

  const parentType =
    block?.hostType === runtimeConfig.itemEntityType
      ? block.parentBlockBundle
      : undefined

  const ctxProps =
    item?.bundle === 'from_library'
      ? (item?.props as any)?.libraryItem?.block?.props
      : item?.props

  const visibleKeys =
    // We have to cast to any here because the types are guaranteed to be correct.
    props.definition.editor!.determineVisibleOptions({
      options: currentValues.value as any,
      parentType: parentType as any,
      props: ctxProps as any,
      entity: context.value,
      fieldListType: block?.hostFieldListType || 'default',
    })

  return availableOptions.value.filter((v) => visibleKeys.includes(v.property))
})

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
            options: [],
          }
        }

        acc[option.option.group].options.push(option)
      }
      return acc
    }, {}),
  )
})

function setOptionValue(key: string, value: string) {
  props.uuids.forEach((uuid) => {
    updated.set(uuid, key, value)

    if (!state.mutatedOptions[uuid]) {
      state.mutatedOptions[uuid] = {}
    }
    state.mutatedOptions[uuid][key] = value
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

  state.mutateWithLoadingState(() => adapter.updateOptions!(values))
})
</script>

<script lang="ts">
export default {
  name: 'OptionsForm',
}
</script>
