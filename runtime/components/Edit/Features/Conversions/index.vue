<template>
  <PluginItemDropdown
    v-if="possibleConversions.length"
    :title="text('convertTo')"
  >
    <button
      @click.prevent="onConvert(conversion.id)"
      v-for="conversion in possibleConversions"
    >
      <ItemIcon :bundle="conversion.id" />
      <div>
        <div>{{ conversion.label }}</div>
      </div>
    </button>
  </PluginItemDropdown>
</template>

<script lang="ts" setup>
import { ItemIcon } from '#blokkli/components'
import { PluginItemDropdown } from '#blokkli/plugins'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type { BlokkliItemType } from '#blokkli/types'

const { adapter, types, selection, state, text } = useBlokkli()

const { data: conversionsData } = await useLazyAsyncData(() => {
  if (adapter.getConversions) {
    return adapter.getConversions()
  }
  return Promise.resolve([])
})

const conversions = computed(() => conversionsData.value || [])

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await state.mutateWithLoadingState(
    adapter.convertItems(
      selection.blocks.value.map((v) => v.uuid),
      targetBundle,
    ),
    text('failedToConvert'),
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
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => types.allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})
</script>
