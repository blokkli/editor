<template>
  <PluginItemDropdown
    id="conversions"
    :title="$t('convertTo', 'Convert to...')"
    :enabled="!!possibleConversions.length"
    :items="possibleConversions"
    weight="900"
    @select="onConvert($event.id)"
  />
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
  watch,
} from '#imports'
import { PluginItemDropdown } from '#blokkli/plugins'
import { falsy, onlyUnique } from '#blokkli/helpers'

const { adapter } = defineBlokkliFeature({
  id: 'conversions',
  label: 'Conversions',
  icon: 'convert',
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

const { types, selection, state, $t } = useBlokkli()

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
        selection.blocks.value.map((v) => v.uuid),
        targetBundle,
      ),
    $t('failedToConvert', 'The block could not be converted.'),
  )
}

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const possibleConversions = computed<ItemDropdownItem[]>(() => {
  if (itemBundleIds.value.length !== 1) {
    return []
  }
  const sourceType = itemBundleIds.value[0]
  const titleBase = $t('conversionsConvertTo', 'Convert to: @bundle')
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle),
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

watch(possibleConversions, (v) => {
  console.log(v)
})
</script>

<script lang="ts">
export default {
  name: 'Conversions',
}
</script>
