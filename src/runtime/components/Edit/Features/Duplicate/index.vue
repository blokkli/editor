<template>
  <PluginItemAction
    id="duplicate"
    :title="$t('duplicate', 'Duplicate')"
    :disabled="!canDuplicate"
    edit-only
    meta
    key-code="D"
    multiple
    icon="duplicate"
    :weight="-90"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import type { RenderedFieldListItem } from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'
import { getFieldKey } from '#blokkli/helpers'

const { state, $t, selection, types } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'duplicate',
  icon: 'duplicate',
  label: 'Duplicate',
  requiredAdapterMethods: ['duplicateBlocks'],
  description: 'Provides an action to duplicate one or more blocks in place.',
})

function onClick(items: RenderedFieldListItem[]) {
  state.mutateWithLoadingState(
    () => adapter.duplicateBlocks(items.map((v) => v.uuid)),
    $t('duplicateError', 'The items could not be duplicated.'),
  )
}

const canDuplicate = computed<boolean>(() => {
  const blocksByField: Record<string, RenderedFieldListItem[]> = {}
  const fieldsByKey: Record<
    string,
    { cardinality: number; allowedBundles: string[]; count: number }
  > = {}

  const selectedCount = selection.items.value.length
  for (let i = 0; i < selectedCount; i++) {
    const block = selection.items.value[i]!
    const field = state.getMutatedField(block.host.uuid, block.host.fieldName)
    if (!field) {
      continue
    }

    const fieldKey = getFieldKey(field.entityUuid, field.name)

    const fieldConfig = types.getFieldConfig(
      field.entityType,
      block.host.bundle,
      field.name,
    )
    if (!fieldConfig) {
      continue
    }
    const count = field.list.length

    // Early return if the field is already full.
    if (fieldConfig.cardinality !== -1 && count >= fieldConfig.cardinality) {
      return false
    }

    if (!blocksByField[fieldKey]) {
      blocksByField[fieldKey] = []
    }
    blocksByField[fieldKey].push(block)
    fieldsByKey[fieldKey] = {
      cardinality: fieldConfig.cardinality,
      allowedBundles: fieldConfig.allowedBundles,
      count,
    }
  }

  const entries = Object.entries(blocksByField)
  for (let i = 0; i < entries.length; i++) {
    const [fieldKey, blocks] = entries[i]!
    const field = fieldsByKey[fieldKey]

    if (!field) {
      return false
    }

    const count = state.getFieldBlockCount(fieldKey)
    // Check cardinality of the field.
    if (field.cardinality !== -1 && count + blocks.length > field.cardinality) {
      return false
    }

    // Check if all bundles are allowed in the field. The restrictions may
    // have changed and the block to be duplicated isn't allowed anymore in
    // the field.
    const bundles = blocks.map((v) => v.bundle)
    if (
      !field.allowedBundles.length ||
      bundles.some((bundle) => !field.allowedBundles.includes(bundle))
    ) {
      return false
    }
  }

  return true
})
</script>

<script lang="ts">
export default {
  name: 'Duplicate',
}
</script>
