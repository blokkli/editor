<template>
  <Sortli v-if="shouldRender" id="blokkli-add-list-blocks" :build-item>
    <AddListItem
      v-for="type in sortedList"
      v-show="type.isVisible"
      :id="type.id"
      :key="type.id"
      context="add-list-blocks"
      :label="type.label"
      :bundle="type.id"
      :disabled="type.isDisabled"
      :color="type.isFavorite ? 'yellow' : 'default'"
      data-element-type="new"
      :data-item-bundle="type.id"
    />
  </Sortli>

  <PluginTourItem
    v-if="shouldRender"
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
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'
import { AddListItem, Sortli } from '#blokkli/components'
import type {
  BlockBundleDefinition,
  Command,
  DraggableNewItem,
  FieldConfig,
  RenderedFieldListItem,
} from '#blokkli/types'
import { isInternalBundle } from '#blokkli/editor/helpers/bundles'
import { PluginTourItem } from '#blokkli/editor/plugins'
import { getFieldKey } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'
import { defineCommands } from '#blokkli/editor/composables'

const props = defineProps<{
  hideDisabledBlocks?: boolean
  selectableBundles: string[]
  generallyAvailableBundles: BlockBundleDefinition[]
}>()

const {
  selection,
  storage,
  types,
  context,
  ui,
  eventBus,
  $t,
  state,
  definitions,
  blocks,
} = useBlokkli()

function buildItem(element: HTMLElement): DraggableNewItem | undefined {
  const itemBundle = element.dataset.sortliId
  if (!itemBundle) {
    return
  }

  return {
    itemType: 'new',
    itemBundle,
    element: () => element,
  }
}

const shouldRender = computed(() => state.editMode.value === 'editing')

const searchText = ref('')

const favorites = storage.use<string[]>('blockFavorites', [])

function determineVisibility(bundle: string, label: string): boolean {
  if (ui.isMobile.value && !props.selectableBundles.includes(bundle)) {
    return false
  }

  if (
    searchText.value &&
    !label.toLowerCase().includes(searchText.value.toLowerCase())
  ) {
    return false
  }

  const definition = definitions.getDefaultDefinition(bundle)

  if (definition?.editor?.maxInstances) {
    const existingInstancesOfBundle = state.getBlockBundleCount(bundle)
    return existingInstancesOfBundle < definition.editor.maxInstances
  }

  return true
}

const sortedList = computed(() => {
  return [...props.generallyAvailableBundles]
    .filter((v) => !isInternalBundle(v.id))
    .map((v) => {
      const isVisible = determineVisibility(v.id, v.label)
      const isDisabled = !v.id || !props.selectableBundles.includes(v.id)
      return {
        ...v,
        isDisabled,
        isVisible: isVisible && (!props.hideDisabledBlocks || !isDisabled),
        isFavorite: favorites.value.includes(v.id),
      }
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1

      return a.label.localeCompare(b.label)
    })
})

const getBundlesForAppendCommands = () => {
  const item = selection.item.value
  if (!item) {
    return []
  }

  const field: FieldConfig | undefined = types.getFieldConfig(
    item.host.type,
    item.host.bundle,
    item.host.fieldName,
  )

  if (field) {
    if (field.cardinality !== -1) {
      const key = getFieldKey(item.host.uuid, item.host.fieldName)
      const count = state.getFieldBlockCount(key)
      // No more blocks allowed.
      if (count >= field.cardinality) {
        return []
      }
    }
    return field.allowedBundles.filter((v) => !isInternalBundle(v))
  }

  return []
}

const getAppendEndCommands = (): Command[] => {
  if (selection.items.value.length !== 0) {
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
        .filter((v) => !isInternalBundle(v))
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
    afterUuid: afterUuid ?? null,
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
    afterUuid: afterUuid ?? null,
    host: {
      type: hostType,
      uuid: hostUuid,
      fieldName,
    },
  })
}

const getInsertCommands = (
  block: RenderedFieldListItem | undefined,
): Command[] => {
  if (!block) {
    return []
  }

  // Find nested fields of the block.
  const nestedFields = types.fieldConfig
    .forEntityTypeAndBundle(itemEntityType, block.bundle)
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

  if (block.host.type === itemEntityType) {
    const parentBlock = blocks.getBlock(block.host.uuid)
    if (parentBlock) {
      getInsertCommands(parentBlock).forEach((parentCommand) => {
        commands.push(parentCommand)
      })
    }
  }

  return commands
}

const commandCallbackAppend = (bundle: string) => {
  const block = selection.items.value[0]
  if (!block) {
    return
  }
  eventBus.emit('block:append', {
    bundle,
    afterUuid: selection.uuids.value[0]!,
    host: {
      type: block.host.type,
      uuid: block.host.uuid,
      fieldName: block.host.fieldName,
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
    ...getInsertCommands(selection.items.value[0]),
    ...getAppendEndCommands(),
  ]
})
</script>

<script lang="ts">
export default {
  name: 'AddListBlocks',
}
</script>
