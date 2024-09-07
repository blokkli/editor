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
</template>

<script lang="ts" setup>
import {
  computed,
  watch,
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
} from '#imports'
import { PluginItemDropdown } from '#blokkli/plugins'
import { onlyUnique } from '#blokkli/helpers'
import type {
  DraggableExistingBlock,
  DropArea,
  TransformPlugin,
} from '#blokkli/types'
import { filterTransforms } from '#blokkli/helpers/transform'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import defineDropAreas from '#blokkli/helpers/composables/defineDropAreas'

const { adapter } = defineBlokkliFeature({
  id: 'transform',
  icon: 'script',
  label: 'Transform',
  requiredAdapterMethods: ['getTransformPlugins', 'applyTransformPlugin'],
  description: 'Provides integration for block transform plugins.',
  screenshot: 'feature-transform.jpg',
})

const { types, selection, state, $t, dom } = useBlokkli()

const {
  data: plugins,
  execute,
  status,
} = await useLazyAsyncData(
  () => {
    return adapter.getTransformPlugins()
  },
  { immediate: false, default: () => [] },
)

watch(selection.uuids, async () => {
  if (status.value === 'idle') {
    execute()
  }
})

async function onTransform(plugin: TransformPlugin, uuids: string[]) {
  await state.mutateWithLoadingState(
    () =>
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
    plugins.value || [],
    selection.uuids.value,
    itemBundleIds.value,
    types.allowedTypesInList.value,
  ),
)

defineCommands(() =>
  possibleTransforms.value.map((transform) => ({
    id: 'transform:' + transform.id,
    label: transform.label,
    group: 'selection',
    icon: 'script',
    callback: () => onTransform(transform, selection.uuids.value),
  })),
)

const getPossibleDropTransforms = (
  plugins: TransformPlugin[],
  allBlocks: DraggableExistingBlock[],
  dragItems: DraggableExistingBlock[],
): PossibleTransform[] => {
  // Filter out the dragged items from allBlocks.
  const notDraggedBlocks = allBlocks.filter(
    (block) => !dragItems.find((dragItem) => dragItem.uuid === block.uuid),
  )

  // Determine possible plugins based on the dragged items.
  const validPlugins = plugins.filter((plugin) => {
    const draggedBundles = dragItems.map((item) => item.itemBundle)
    return (
      draggedBundles.every((bundle) => plugin.bundles.includes(bundle)) &&
      dragItems.length + 1 >= plugin.min &&
      (plugin.max === -1 || dragItems.length + 1 <= plugin.max)
    )
  })

  // Find possible transformations for each valid plugin
  const possibleTransforms: PossibleTransform[] = []
  validPlugins.forEach((plugin) => {
    notDraggedBlocks.forEach((block) => {
      if (plugin.targetBundles.includes(block.itemBundle)) {
        possibleTransforms.push({
          plugin,
          block,
        })
      }
    })
  })

  return possibleTransforms
}

type PossibleTransform = {
  plugin: TransformPlugin
  block: DraggableExistingBlock
}

defineDropAreas((dragItems) => {
  const existing = dragItems.filter(
    (v) => v.itemType === 'existing',
  ) as DraggableExistingBlock[]

  if (!existing.length) {
    return
  }

  const uuids = existing.map((v) => v.uuid)

  return getPossibleDropTransforms(
    plugins.value,
    dom.getAllBlocks(),
    existing,
  ).map<DropArea>((v) => {
    return {
      id: `transform:${v.plugin.id}:${v.block.uuid}`,
      label: v.plugin.label,
      element: v.block.element(),
      onDrop: () => {
        const transformUuids = [v.block.uuid, ...uuids]
        return onTransform(v.plugin, transformUuids)
      },
    }
  })
})
</script>

<script lang="ts">
export default {
  name: 'Transform',
}
</script>
