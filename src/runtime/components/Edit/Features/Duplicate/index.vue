<template>
  <PluginItemAction
    :title="$t('duplicate')"
    :disabled="!canDuplicate"
    meta
    key-code="D"
    multiple
    icon="duplicate"
    :weight="-90"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'

import type {
  BlokkliFieldElement,
  DraggableExistingBlock,
} from '#blokkli/types'
import { PluginItemAction } from '#blokkli/plugins'

const { state, $t, selection, dom } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'duplicate',
  icon: 'duplicate',
  requiredAdapterMethods: ['duplicateBlocks'],
  description: 'Provides an action to duplicate one or more blocks in place.',
})

function onClick(items: DraggableExistingBlock[]) {
  state.mutateWithLoadingState(
    adapter.duplicateBlocks(items.map((v) => v.uuid)),
    $t('duplicateError'),
  )
}

const findField = (uuid: string): BlokkliFieldElement | undefined => {
  try {
    return dom.getBlockField(uuid)
  } catch (_e) {
    // Noop.
  }
}

const canDuplicate = computed<boolean>(() => {
  if (state.editMode.value !== 'editing') {
    return false
  }

  const blocksByField: Record<string, DraggableExistingBlock[]> = {}
  const fieldsByKey: Record<string, BlokkliFieldElement> = {}

  const selectedCount = selection.blocks.value.length
  for (let i = 0; i < selectedCount; i++) {
    const block = selection.blocks.value[i]
    const field = findField(block.uuid)
    if (!field) {
      return false
    }

    // Early return if the field is already full.
    if (field.cardinality !== -1 && field.blockCount >= field.cardinality) {
      return false
    }

    if (!blocksByField[field.key]) {
      blocksByField[field.key] = []
    }
    blocksByField[field.key].push(block)
    fieldsByKey[field.key] = field
  }

  const entries = Object.entries(blocksByField)
  for (let i = 0; i < entries.length; i++) {
    const [fieldKey, blocks] = entries[i]
    const field = fieldsByKey[fieldKey]
    // Check cardinality of the field.
    if (
      field.cardinality !== -1 &&
      field.blockCount + blocks.length > field.cardinality
    ) {
      return false
    }

    // Check if all bundles are allowed in the field. The restrictions may
    // have changed and the block to be duplicated isn't allowed anymore in
    // the field.
    const bundles = blocks.map((v) => v.itemBundle)
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
