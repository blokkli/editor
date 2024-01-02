<template>
  <PluginItemDropdown
    id="conversions"
    :title="$t('convertTo')"
    :enabled="!!possibleConversions.length"
  >
    <button
      v-for="conversion in possibleConversions"
      :key="conversion.id"
      @click.prevent="onConvert(conversion.id)"
    >
      <ItemIcon :bundle="conversion.id" />
      <div>
        <div>{{ conversion.label }}</div>
      </div>
    </button>
  </PluginItemDropdown>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { ItemIcon } from '#blokkli/components'
import { PluginItemDropdown } from '#blokkli/plugins'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type { BlokkliItemType } from '#blokkli/types'

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['getConversions', 'convertBlocks'],
  description:
    'Provides block actions to convert one or more blocks to a different bundle.',
})

const { types, selection, state, $t } = useBlokkli()

const conversions = await adapter.getConversions()

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await state.mutateWithLoadingState(
    adapter.convertBlocks(
      selection.blocks.value.map((v) => v.uuid),
      targetBundle,
    ),
    $t('failedToConvert'),
  )
}

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const possibleConversions = computed<BlokkliItemType[]>(() => {
  if (itemBundleIds.value.length !== 1) {
    return []
  }
  const sourceType = itemBundleIds.value[0]
  return conversions
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => types.allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})
</script>

<script lang="ts">
export default {
  name: 'Conversions',
}
</script>
