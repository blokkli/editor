<template>
  <Teleport
    v-if="selectableBundles.length && shouldRender"
    :key="renderKey"
    to="#blokkli-add-list-blocks"
  >
    <AddListItem
      v-for="(type, i) in sortedList"
      v-show="type.isVisible"
      :id="type.id"
      :key="i + (type.id || 'undefined') + renderKey"
      :label="type.label"
      :bundle="type.id"
      :orientation="ui.addListOrientation.value"
      :disabled="!type.id || !selectableBundles.includes(type.id)"
      data-element-type="new"
      :data-item-bundle="type.id"
    />
  </Teleport>
  <Teleport
    v-if="
      ui.addListOrientation.value === 'sidebar' &&
      generallyAvailableBundles.length > 10 &&
      shouldRender
    "
    :key="renderKey"
    to="#blokkli-add-list-sidebar-before"
  >
    <div class="bk-list-sidebar-form">
      <input
        id="add_block_search"
        v-model="searchText"
        type="search"
        class="bk-form-input"
        :placeholder="$t('addListInputPlaceholder', 'Search available blocks')"
        required
      />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  defineBlokkliFeature,
  nextTick,
} from '#imports'
import { AddListItem } from '#blokkli/components'
import type { DraggableExistingBlock } from '#blokkli/types'
import { getDefinition } from '#blokkli/definitions'

defineBlokkliFeature({
  id: 'block-add-list',
  label: 'Block Add List',
  icon: 'plus',
  description:
    'Renders a list of block bundles that can be added to the current page.',
  dependencies: ['add-list'],
  screnshot: 'feature-block-add-list.jpg',
})

const {
  selection,
  storage,
  types,
  context,
  runtimeConfig,
  ui,
  eventBus,
  $t,
  state,
} = useBlokkli()

const shouldRender = computed(() => state.editMode.value === 'editing')

const searchText = ref('')

const itemEntityType = runtimeConfig.itemEntityType

const sorts = storage.use<string[]>('sorts', [])

const activeField = computed(() => {
  if (selection.activeFieldKey.value) {
    const el = document.querySelector(
      `[data-field-key="${selection.activeFieldKey.value}"]`,
    )
    if (el && el instanceof HTMLElement) {
      const label = el.dataset.fieldLabel
      const name = el.dataset.fieldName
      const isNested = el.dataset.fieldIsNested === 'true'
      const hostEntityType = el.dataset.hostEntityType
      const hostEntityUuid = el.dataset.hostEntityUuid
      if (label && name && hostEntityType && hostEntityUuid) {
        return { label, name, hostEntityType, hostEntityUuid, isNested }
      }
    }
  }
})

const getAllowedTypesForSelected = (p: DraggableExistingBlock): string[] => {
  // If the selected bundle allows nested items, return the allowed bundles for it instead.
  if (types.itemBundlesWithNested.value.includes(p.itemBundle)) {
    return types.fieldConfig.value
      .filter(
        (v) =>
          v.entityType === itemEntityType && v.entityBundle === p.itemBundle,
      )
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  }
  // If the selected bundle is inside a nested item, return the allowed bundles of the parent bundle.
  if (p.hostType === itemEntityType) {
    return types.fieldConfig.value
      .filter(
        (v) =>
          v.entityType === itemEntityType && v.entityBundle === p.hostBundle,
      )
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  } else {
    return types.fieldConfig.value
      .filter(
        (v) =>
          v.entityType === context.value.entityType &&
          v.entityBundle === context.value.entityBundle &&
          v.name === p.hostFieldName,
      )
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  }
}

const selectableBundles = computed(() => {
  if (selection.blocks.value.length) {
    return selection.blocks.value.flatMap((v) => getAllowedTypesForSelected(v))
  }
  if (
    activeField.value &&
    activeField.value.hostEntityType === context.value.entityType
  ) {
    return (
      types.fieldConfig.value.find((v) => {
        return (
          v.entityBundle === context.value.entityBundle &&
          v.name === activeField.value?.name
        )
      })?.allowedBundles || []
    )
  }

  return generallyAvailableBundles.value.map((v) => v.id || '')
})

const generallyAvailableBundles = computed(() => {
  const typesOnEntity = (
    types.fieldConfig.value.filter((v) => {
      return (
        v.entityType === context.value.entityType &&
        v.entityBundle === context.value.entityBundle
      )
    }) || []
  )
    .flatMap((v) => v.allowedBundles)
    .filter(Boolean)

  const typesOnItems =
    types.fieldConfig.value
      .filter((v) => {
        return typesOnEntity.includes(v.entityBundle)
      })
      .flatMap((v) => v.allowedBundles) || []

  const allAllowedTypes = [...typesOnEntity, ...typesOnItems]

  return (
    types.allTypes.value.filter(
      (v) => v.id && allAllowedTypes.includes(v.id),
    ) || []
  )
})

const existingBlockBundles = computed(() =>
  state.renderedBlocks.value.map((v) => v.item.bundle),
)

const determineVisibility = (bundle: string, label: string): boolean => {
  if (ui.isMobile.value && !selectableBundles.value.includes(bundle)) {
    return false
  }

  if (
    searchText.value &&
    !label.toLowerCase().includes(searchText.value.toLowerCase())
  ) {
    return false
  }

  const definition = getDefinition(bundle)

  if (definition?.editor?.maxInstances) {
    const existingInstancesOfBundle = existingBlockBundles.value.filter(
      (v) => v === bundle,
    )
    return existingInstancesOfBundle.length < definition.editor.maxInstances
  }

  return true
}

const sortedList = computed(() => {
  if (!generallyAvailableBundles.value) {
    return []
  }
  return [...generallyAvailableBundles.value]
    .filter((v) => v.id !== 'from_library')
    .sort((a, b) => {
      if (a.id && b.id) {
        return sorts.value.indexOf(a.id) - sorts.value.indexOf(b.id)
      }
      return 9999
    })
    .map((v) => {
      return {
        ...v,
        isVisible: determineVisibility(v.id, v.label),
      }
    })
})

const renderKey = ref('')

const onAddListChange = () => {
  nextTick(() => {
    renderKey.value = Math.round(Math.random() * 1000000000).toString()
  })
}

onMounted(() => {
  eventBus.on('add-list:change', onAddListChange)
})

onBeforeUnmount(() => {
  eventBus.off('add-list:change', onAddListChange)
})
</script>

<script lang="ts">
export default {
  name: 'BlockAddList',
}
</script>
