<template>
  <PluginItemAction
    id="edit"
    edit-only
    :title="$t('edit', 'Edit...')"
    :disabled="editDisabledReason"
    meta
    key-code="E"
    icon="bk_mdi_edit"
    :weight="-100"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginItemAction } from '#blokkli/editor/plugins'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import { featureFragmentNames } from '#blokkli-build/editor-config'
import { fragmentBlockBundle } from '#blokkli-build/config'

defineBlokkliFeature({
  id: 'edit',
  icon: 'bk_mdi_edit',
  label: 'Edit',
  description: 'Provides an action to edit a block.',
  requiredAdapterMethods: ['formFrameBuilder'],
})

const { eventBus, selection, state, $t, adapter, definitions, permissions } =
  useBlokkli()

const userCanEditLibraryItems = computed(() =>
  permissions.hasPermission('edit_library_item'),
)

function getComplexOption(
  item: RenderedFieldListItem,
): { key: string; dataType: string } | undefined {
  const definition = definitions.getBlockDefinition(
    item.bundle,
    item.fieldListType,
    item.parentBlockBundle,
  )
  if (!definition?.options) {
    return
  }
  const keys = Object.keys(definition.options)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!key) continue
    const option = definition.options[key]
    if (option?.type !== 'json' || !option.dataType) continue
    return { key, dataType: option.dataType }
  }
}

function isFragment(item: RenderedFieldListItem): boolean {
  return item.bundle === fragmentBlockBundle
}

function isFeatureFragment(item: RenderedFieldListItem): boolean {
  return (
    !!item.fragment?.name && featureFragmentNames.includes(item.fragment.name)
  )
}

const editDisabledReason = computed<false | string>(() => {
  const item = selection.item.value

  // Editing is only possible when a single block is selected.
  if (!item) {
    return false
  }

  // Fragments provided by features can always be edited.
  if (isFragment(item)) {
    return isFeatureFragment(item)
      ? false
      : $t('editFragmentNotEditable', 'This fragment cannot be edited.')
  }

  const definition = definitions.getBlockDefinition(
    item.bundle,
    item.fieldListType,
    item.parentBlockBundle,
  )

  // Editing is explicitly disabled via the definition, but still allow it if
  // the block has a complex option that can be opened.
  if (definition?.editor?.disableEdit && !getComplexOption(item)) {
    return $t('editingDisabled', 'Editing is disabled for this block type.')
  }

  if (!permissions.checkBlockBundlePermission(item.bundle, 'edit')) {
    return $t(
      'noEditPermission',
      'You do not have permission to edit this block.',
    )
  }

  // For reusable blocks, editing is only possible if the adapter implements
  // the getLibraryItemEditUrl method.
  if (item.library?.libraryItemUuid) {
    if (!userCanEditLibraryItems.value) {
      return $t(
        'editNoLibraryPermission',
        'You do not have permission to edit library items.',
      )
    }
    if (
      !adapter.getLibraryItemEditUrl ||
      (state.editMode.value !== 'editing' &&
        state.editMode.value !== 'translating') ||
      item.isNew
    ) {
      return $t(
        'editLibraryNotAvailable',
        'This reusable block cannot be edited right now.',
      )
    }
    return false
  }

  if (state.editMode.value !== 'editing') {
    return false
  }

  return false
})

function onClick(items: RenderedFieldListItem[]) {
  if (items.length !== 1) {
    return
  }

  if (editDisabledReason.value) {
    return
  }

  const item = items[0]!

  // Because editing library items inside the current context is not (yet)
  // supported, editing has to happen in a separate window where the host
  // context is the library item entity.
  if (item.library?.libraryItemUuid && adapter.getLibraryItemEditUrl) {
    const url = adapter.getLibraryItemEditUrl(item.library.libraryItemUuid)
    eventBus.emit('library:edit-item', {
      url,
      label: item.library.label,
      uuid: item.library.libraryItemUuid,
      blockUuid: item.uuid,
    })
    return
  }

  if (isFragment(item)) {
    if (isFeatureFragment(item)) {
      eventBus.emit('fragment:edit', {
        uuid: item.uuid,
        name: item.fragment!.name,
      })
    }
    return
  }

  const definition = definitions.getBlockDefinition(
    item.bundle,
    item.fieldListType,
    item.parentBlockBundle,
  )

  if (definition?.editor?.disableEdit) {
    const complexOption = getComplexOption(item)
    if (complexOption) {
      eventBus.emit('option:edit-complex', {
        uuid: item.uuid,
        key: complexOption.key,
        dataType: complexOption.dataType,
      })
      return
    }
  }

  eventBus.emit('item:edit', {
    uuid: item.uuid,
    bundle: item.bundle,
  })
}

onBlokkliEvent('item:doubleClick', function (block) {
  onClick([block])
})
</script>

<script lang="ts">
export default {
  name: 'Edit',
}
</script>
