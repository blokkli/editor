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
      :disabled="type.isDisabled"
      :color="type.isFavorite ? 'yellow' : 'default'"
      data-element-type="new"
      :data-item-bundle="type.id"
    />
    <PluginTourItem
      id="block-add-list"
      :title="$t('blockAddListTourTitle', 'Favorite blocks')"
      :text="
        $t(
          'blockAddListTourText',
          'Right-click on a block to add or remove them from your favorites. Favorites are highlighted and always displayed at the top of the list.',
        )
      "
      selector="#blokkli-add-list-blocks"
    />
  </Teleport>
  <Teleport
    v-if="
      ui.addListOrientation.value === 'sidebar' &&
      types.generallyAvailableBundles.length > 10 &&
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
  defineBlokkliFeature,
  nextTick,
} from '#imports'
import { AddListItem } from '#blokkli/components'
import type {
  Command,
  DraggableExistingBlock,
  FieldConfig,
} from '#blokkli/types'
import { getDefaultDefinition } from '#blokkli/definitions'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { PluginTourItem } from '#blokkli/plugins'
import { getFieldKey } from '#blokkli/helpers'

const { settings } = defineBlokkliFeature({
  id: 'block-add-list',
  label: 'Block Add List',
  icon: 'plus',
  description:
    'Renders a list of block bundles that can be added to the current page.',
  dependencies: ['add-list'],
  screnshot: 'feature-block-add-list.jpg',
  settings: {
    hideDisabledBlocks: {
      type: 'checkbox',
      label: "Hide blocks that can't be added",
      group: 'appearance',
      default: false,
    },
  },
})

const reservedBundles = ['from_library', 'blokkli_fragment']

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
  dom,
} = useBlokkli()

const shouldRender = computed(() => state.editMode.value === 'editing')

const searchText = ref('')

const itemEntityType = runtimeConfig.itemEntityType

const favorites = storage.use<string[]>('blockFavorites', [])

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

  return undefined
})

const getAllowedTypesForSelected = (p: DraggableExistingBlock): string[] => {
  // If the selected bundle allows nested items, return the allowed bundles for it instead.
  if (types.itemBundlesWithNested.includes(p.itemBundle)) {
    return types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, p.itemBundle)
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  }
  // If the selected bundle is inside a nested item, return the allowed bundles of the parent bundle.
  if (p.hostType === itemEntityType) {
    return types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, p.hostBundle)
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  } else {
    return (
      types.getFieldConfig(
        context.value.entityType,
        context.value.entityBundle,
        p.hostFieldName,
      )?.allowedBundles || []
    )
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
      types.getFieldConfig(
        context.value.entityType,
        context.value.entityBundle,
        activeField.value.name,
      )?.allowedBundles || []
    )
  }

  return types.generallyAvailableBundles.map((v) => v.id || '')
})

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

  const definition = getDefaultDefinition(bundle)

  if (definition?.editor?.maxInstances) {
    const existingInstancesOfBundle = state.getBlockBundleCount(bundle)
    return existingInstancesOfBundle < definition.editor.maxInstances
  }

  return true
}

const sortedList = computed(() => {
  return [...types.generallyAvailableBundles]
    .filter((v) => !reservedBundles.includes(v.id))
    .map((v) => {
      const isVisible = determineVisibility(v.id, v.label)
      const isDisabled = !v.id || !selectableBundles.value.includes(v.id)
      return {
        ...v,
        isDisabled,
        isVisible:
          isVisible && (!settings.value.hideDisabledBlocks || !isDisabled),
        isFavorite: favorites.value.includes(v.id),
      }
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1

      return a.label.localeCompare(b.label)
    })
})

const renderKey = ref('')

const getBundlesForAppendCommands = () => {
  if (selection.blocks.value.length !== 1) {
    return []
  }

  const block = selection.blocks.value[0]
  const field: FieldConfig | undefined = types.getFieldConfig(
    block.hostType,
    block.hostBundle,
    block.hostFieldName,
  )

  if (field) {
    if (field.cardinality !== -1) {
      const key = getFieldKey(block.hostUuid, block.hostFieldName)
      const count = state.getFieldBlockCount(key)
      // No more blocks allowed.
      if (count >= field.cardinality) {
        return []
      }
    }
    return field.allowedBundles.filter((v) => !reservedBundles.includes(v))
  }

  return []
}

const getAppendEndCommands = (): Command[] => {
  if (selection.blocks.value.length !== 0) {
    return []
  }

  return types.fieldConfig
    .forEntityTypeAndBundle(
      context.value.entityType,
      context.value.entityBundle,
    )
    .flatMap((field: FieldConfig) => {
      if (field.cardinality !== -1) {
        const key = getFieldKey(context.value.entityUuid, field.name)
        const count = state.getFieldBlockCount(key)
        // No more blocks allowed.
        if (count >= field.cardinality) {
          return []
        }
      }
      return field.allowedBundles
        .filter((v) => !reservedBundles.includes(v))
        .map((bundle: string) => {
          const definition = types.getBlockBundleDefinition(bundle)
          return {
            id: 'block_add_list:append_end:' + bundle + field.name,
            label: $t(
              'addBlockCommand.appendInField',
              'Append "@block" in "@field"',
            )
              .replace('@block', definition?.label || bundle)
              .replace('@field', field.label),
            group: 'add',
            bundle,
            callback: () => commandCallbackAppendEnd(bundle, field.name),
          }
        })
    })
}

const commandCallbackAppendEnd = (bundle: string, fieldName: string) => {
  const field = state.mutatedFields.value.find(
    (v) =>
      v.name === fieldName &&
      v.entityType === context.value.entityType &&
      v.entityUuid === context.value.entityUuid,
  )

  if (!field) {
    return
  }

  const afterUuid = field.list[field.list.length - 1]?.uuid || undefined
  eventBus.emit('block:append', {
    bundle,
    afterUuid,
    host: {
      type: context.value.entityType,
      uuid: context.value.entityUuid,
      fieldName,
    },
  })
}

const commandCallbackInsert = (
  bundle: string,
  fieldName: string,
  hostType: string,
  hostUuid: string,
) => {
  const field = state.mutatedFields.value.find(
    (v) =>
      v.name === fieldName &&
      v.entityType === hostType &&
      v.entityUuid === hostUuid,
  )
  const afterUuid = field ? field.list[field.list.length - 1]?.uuid : undefined
  eventBus.emit('block:append', {
    bundle,
    afterUuid,
    host: {
      type: hostType,
      uuid: hostUuid,
      fieldName,
    },
  })
}

const getInsertCommands = (
  block: DraggableExistingBlock | undefined,
): Command[] => {
  if (!block) {
    return []
  }

  // Find nested fields of the block.
  const nestedFields = types.fieldConfig
    .forEntityTypeAndBundle(itemEntityType, block.itemBundle)
    .map((field) => {
      return {
        ...field,
        uuid: block.uuid,
      }
    })

  const commands: Command[] = nestedFields.flatMap(
    (field: FieldConfig & { uuid: string }) => {
      return field.allowedBundles.map((bundle: string) => {
        const label = types.getBlockBundleDefinition(bundle)?.label || bundle
        return {
          id: 'block_add_list:insert:' + field.name + ':' + bundle,
          label: $t(
            'addBlockCommand.insertInField',
            'Insert "@block" into "@field"',
          )
            .replace('@block', label)
            .replace('@field', field.label),
          group: 'add',
          bundle,
          callback: () =>
            commandCallbackInsert(
              bundle,
              field.name,
              field.entityType,
              field.uuid,
            ),
        }
      })
    },
  )

  if (block.hostType === runtimeConfig.itemEntityType) {
    const parentBlock = dom.findBlock(block.hostUuid)
    if (parentBlock) {
      getInsertCommands(parentBlock).forEach((parentCommand) => {
        commands.push(parentCommand)
      })
    }
  }

  return commands
}

const commandCallbackAppend = (bundle: string) => {
  const block = selection.blocks.value[0]
  eventBus.emit('block:append', {
    bundle,
    afterUuid: selection.uuids.value[0],
    host: {
      type: block.hostType,
      uuid: block.hostUuid,
      fieldName: block.hostFieldName,
    },
  })
}

const getAppendCommands = (): Command[] => {
  return getBundlesForAppendCommands().map((bundle) => {
    const definition = types.getBlockBundleDefinition(bundle)
    return {
      id: 'block_add_list:append:' + bundle,
      label: $t('addBlockCommand.appendRoot', 'Append "@block"').replace(
        '@block',
        definition?.label || bundle,
      ),
      group: 'add',
      bundle,
      callback: () => commandCallbackAppend(bundle),
    }
  })
}

defineCommands(() => {
  if (state.editMode.value !== 'editing') {
    return
  }
  return [
    ...getAppendCommands(),
    ...getInsertCommands(selection.blocks.value[0]),
    ...getAppendEndCommands(),
  ]
})

onBlokkliEvent('add-list:change', () => {
  nextTick(() => {
    renderKey.value = Math.round(Math.random() * 1000000000).toString()
  })
})
</script>

<script lang="ts">
export default {
  name: 'BlockAddList',
}
</script>
