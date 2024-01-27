<template>
  <PluginItemDropdown
    id="transform"
    :title="$t('transformTo', 'Other actions')"
    :enabled="!!(itemBundleIds.length && possibleTransforms.length)"
  >
    <button
      v-for="transform in possibleTransforms"
      :key="transform.id"
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
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { PluginItemDropdown } from '#blokkli/plugins'
import { onlyUnique } from '#blokkli/helpers'
import type { TransformPlugin } from '#blokkli/types'
import Overlay from './Overlay/index.vue'
import { filterTransforms } from '#blokkli/helpers/transform'

const { adapter } = defineBlokkliFeature({
  id: 'transform',
  icon: 'puzzle',
  label: 'Transform',
  requiredAdapterMethods: ['getTransformPlugins', 'applyTransformPlugin'],
  description: 'Provides integration for block transform plugins.',
  screenshot: 'feature-transform.jpg',
})

const { types, selection, state, $t } = useBlokkli()

const plugins = await adapter.getTransformPlugins()

async function onTransform(plugin: TransformPlugin, uuids: string[]) {
  await state.mutateWithLoadingState(
    adapter.applyTransformPlugin({
      uuids,
      pluginId: plugin.id,
    }),
    $t(
      'failedToTransform',
      'The action "@name" could not be executed.',
    ).replace('@name', plugin.label),
  )
}

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const possibleTransforms = computed<TransformPlugin[]>(() =>
  filterTransforms(
    plugins,
    selection.uuids.value,
    itemBundleIds.value,
    types.allowedTypesInList.value,
  ),
)
</script>

<script lang="ts">
export default {
  name: 'Transform',
}
</script>
