<template>
  <PluginItemDropdown
    id="transform"
    :title="text('transformTo')"
    :enabled="!!(itemBundleIds.length && possibleTransforms.length)"
  >
    <button
      v-for="transform in possibleTransforms"
      @click.prevent="onTransform(transform, selection.uuids.value)"
    >
      <div>
        <div>{{ transform.label }}</div>
      </div>
    </button>
  </PluginItemDropdown>
  <Overlay
    v-if="selection.isDragging.value && selection.uuids.value.length"
    :selected-uuids="selection.uuids.value"
    :selected-bundles="itemBundleIds"
    :plugins="plugins"
    @transform="onTransform($event.plugin, $event.uuids)"
  />
</template>

<script lang="ts" setup>
import { PluginItemDropdown } from '#blokkli/plugins'
import { onlyUnique } from '#blokkli/helpers'
import type { BlokkliTransformPlugin } from '#blokkli/types'
import Overlay from './Overlay/index.vue'
import { filterTransforms } from '#blokkli/helpers/transform'

const { adapter, types, selection, state, text } = useBlokkli()

const { data: transformData } = await useLazyAsyncData(() => {
  if (adapter.getTransformPlugins) {
    return adapter.getTransformPlugins()
  }
  return Promise.resolve([])
})

const plugins = computed(() => transformData.value || [])

async function onTransform(plugin: BlokkliTransformPlugin, uuids: string[]) {
  await state.mutateWithLoadingState(
    adapter.applyTransformPlugin({
      uuids,
      pluginId: plugin.id,
    }),
    text('failedToTransform').replace('@name', plugin.label),
  )
}

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const possibleTransforms = computed<BlokkliTransformPlugin[]>(() => {
  return filterTransforms(
    plugins.value,
    selection.uuids.value,
    itemBundleIds.value,
    types.allowedTypesInList.value,
  )
})
</script>
