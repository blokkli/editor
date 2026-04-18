<template>
  <PluginItemAction
    id="swap"
    edit-only
    :title="$t('swapButton', 'Swap block positions')"
    :disabled="swapDisabledReason"
    :hidden="selection.items.value.length !== 2"
    multiple
    icon="bk_mdi_swap_vert"
    :weight="7000"
    @click="onClick"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import { PluginItemAction } from '#blokkli/editor/plugins'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import { getSwapDisabledReason } from '#blokkli/editor/helpers/swap'

const { state, $t, selection, types, permissions } = useBlokkli()

const { adapter } = defineBlokkliFeature({
  id: 'swap',
  icon: 'bk_mdi_swap_vert',
  label: 'Swap',
  description: 'Provides an action to swap two selected blocks.',
  requiredAdapterMethods: ['swapBlocks'],
})

const swapDisabledReason = computed<false | string>(() => {
  const items = selection.items.value
  if (items.length !== 2) {
    return false
  }

  const reason = getSwapDisabledReason(items[0]!, items[1]!, {
    getFieldConfig: types.getFieldConfig,
    checkBlockBundlePermission: permissions.checkBlockBundlePermission,
    blockHasRestrictedAncestor: permissions.blockHasRestrictedAncestor,
  })
  if (reason) {
    return $t('swapNotPossible', 'Block positions cannot be swapped.')
  }

  return false
})

async function onClick(items: RenderedFieldListItem[]) {
  if (items.length !== 2) {
    return
  }

  await state.mutateWithLoadingState(
    () => adapter.swapBlocks(items[0]!.uuid, items[1]!.uuid),
    $t('swapError', 'The blocks could not be swapped.'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Swap',
}
</script>
