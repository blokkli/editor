<template>
  <div />
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
  watch,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import { defineItemDropdownAction } from '#blokkli/editor/composables'

const { adapter } = defineBlokkliFeature({
  id: 'conversions',
  label: 'Conversions',
  icon: 'bk_mdi_swap_horizontal_circle',
  requiredAdapterMethods: ['getConversions', 'convertBlocks'],
  description:
    'Provides block actions to convert one or more blocks to a different bundle.',
})

type ItemDropdownItem = {
  id: string
  label: string
  bundle: string
  description?: string
}

const { types, selection, state, $t, permissions } = useBlokkli()

const {
  data: conversions,
  execute,
  status,
} = await useLazyAsyncData(() => adapter.getConversions(), {
  immediate: false,
  default: () => [],
})

watch(selection.uuids, () => {
  if (status.value === 'idle') {
    execute()
  }
})

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await state.mutateWithLoadingState(
    () =>
      adapter.convertBlocks(
        selection.items.value.map((v) => v.uuid),
        targetBundle,
      ),
    $t('failedToConvert', 'The block could not be converted.'),
  )
}

const possibleConversions = computed<ItemDropdownItem[]>(() => {
  if (selection.bundles.value.length !== 1) {
    return []
  }
  const sourceType = selection.bundles.value[0]
  // A conversion replaces each block in its field: it deletes the block and
  // adds one of the target type.
  if (
    !sourceType ||
    !permissions.checkBlockBundlePermission(sourceType, 'delete') ||
    !selection.items.value.every((item) =>
      permissions.canChangeBlockField(item.uuid),
    )
  ) {
    return []
  }
  const titleBase = $t('conversionsConvertTo', 'Convert to: @bundle')
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle) &&
        permissions.checkBlockBundlePermission(v.targetBundle, 'add'),
    )
    .map((v) => types.getBlockBundleDefinition(v.targetBundle))
    .filter(falsy)
    .map((v) => {
      return {
        id: v.id,
        label: titleBase.replace('@bundle', v.label),
        bundle: v.id,
      }
    })
})

defineItemDropdownAction(() => {
  if (possibleConversions.value.length) {
    return possibleConversions.value.map((conversion) => ({
      id: 'conversion-' + conversion.id,
      label: conversion.label,
      bundle: conversion.bundle,
      group: 'conversions',
      weight: 900,
      callback: () => {
        onConvert(conversion.id)
      },
    }))
  }
})
</script>

<script lang="ts">
export default {
  name: 'Conversions',
}
</script>
