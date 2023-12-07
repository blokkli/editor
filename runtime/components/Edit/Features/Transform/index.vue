<template>
  <PluginItemDropdown
    :title="text('transformTo')"
    v-if="possibleTransforms.length"
  >
    <button
      v-for="transform in possibleTransforms"
      @click.prevent="onTransform(transform)"
    >
      <div>
        <div>{{ transform.label }}</div>
      </div>
    </button>
  </PluginItemDropdown>
</template>

<script lang="ts" setup>
import { PluginItemDropdown } from '#blokkli/plugins'
import { onlyUnique } from '#blokkli/helpers'
import type { BlokkliTransformPlugin } from '#blokkli/types'

const { adapter, types, selection, state, text } = useBlokkli()

const { data: transformData } = await useLazyAsyncData(() => {
  if (adapter.getTransformPlugins) {
    return adapter.getTransformPlugins()
  }
  return Promise.resolve([])
})

const transforms = computed(() => transformData.value || [])

async function onTransform(plugin: BlokkliTransformPlugin) {
  await state.mutateWithLoadingState(
    adapter.applyTransformPlugin({
      uuids: selection.blocks.value.map((v) => v.uuid),
      pluginId: plugin.id,
    }),
    text('failedToTransform').replace('@name', plugin.label),
  )
}

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const possibleTransforms = computed<BlokkliTransformPlugin[]>(() => {
  return transforms.value.filter((plugin) => {
    if (selection.uuids.value.length < plugin.min) {
      return false
    }

    if (plugin.max !== -1 && selection.uuids.value.length > plugin.max) {
      return false
    }

    // Check that the target bundles of the transform plugin are all allowed in the current field list.
    const allAllowedInList = plugin.targetBundles.every((bundle) =>
      types.allowedTypesInList.value.includes(bundle),
    )
    if (!allAllowedInList) {
      return false
    }

    // Filter for supported bundles.
    return itemBundleIds.value.every((bundle) =>
      plugin.bundles.includes(bundle),
    )
  })
})
</script>
