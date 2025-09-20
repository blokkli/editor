<template>
  <PluginItemDropdown
    id="transform"
    :title="$t('transformTo', 'Actions')"
    :enabled="!!(itemBundleIds.length && possibleTransforms.length)"
    :items="possibleTransforms"
    icon="script"
    @select="onSelectBlockTransformPlugin($event, selection.uuids.value)"
  />

  <PluginItemDropdown
    v-if="hostPlugins.length"
    id="transform-host"
    :title="$t('transformTo', 'Actions')"
    :enabled="selection.hasHostSelected.value"
    :items="hostPlugins"
    icon="script"
    @select="onSelectHostTransformPlugin($event)"
  />

  <Teleport to="body">
    <Transition appear name="bk-slide-up">
      <TransformDialog
        v-if="openPluginDefinition"
        :title="openPluginDefinition.label"
        :config="openPluginDefinition.configInputs ?? []"
        :lead="openPluginDefinition.description"
        @cancel="cancelTransform"
        @submit="onSubmitDialog"
      />
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  computed,
  watch,
  ref,
  useBlokkli,
  defineBlokkliFeature,
  useLazyAsyncData,
} from '#imports'
import { PluginItemDropdown } from '#blokkli/plugins'
import { onlyUnique } from '#blokkli/helpers'
import type {
  DraggableExistingBlock,
  HostTransformPlugin,
  PluginConfigInputItem,
  TransformPlugin,
} from '#blokkli/types'
import { filterTransforms } from '#blokkli/helpers/transform'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import TransformDialog from './Dialog/index.vue'

const { adapter } = defineBlokkliFeature({
  id: 'transform',
  icon: 'script',
  label: 'Transform',
  requiredAdapterMethods: ['getTransformPlugins', 'applyTransformPlugin'],
  description: 'Provides integration for block transform plugins.',
  screenshot: 'feature-transform.jpg',
})

type TransformType = 'block' | 'host'

const { types, selection, state, $t, dom, ui } = useBlokkli()

const openPlugin = ref<{
  type: TransformType
  id: string
} | null>(null)

const {
  data: plugins,
  execute,
  status,
} = await useLazyAsyncData(
  () => {
    return adapter.getTransformPlugins()
  },
  {
    immediate: false,
    default: () => [],
    transform: function (plugins) {
      return plugins.map((plugin) => {
        return {
          ...plugin,
          label: getPluginLabel(plugin),
        }
      })
    },
  },
)

const {
  data: hostPlugins,
  status: statusHostPlugins,
  execute: executeHostPlugins,
} = await useLazyAsyncData(
  () => {
    if (adapter.getHostTransformPlugins) {
      return adapter.getHostTransformPlugins()
    }

    return Promise.resolve([])
  },
  {
    immediate: !openPlugin.value,
    default: () => [],
    transform: function (plugins) {
      return plugins.map((plugin) => {
        return {
          ...plugin,
          label: getPluginLabel(plugin),
        }
      })
    },
  },
)

const openPluginDefinition = computed<
  TransformPlugin | HostTransformPlugin | null
>(() => {
  if (openPlugin.value) {
    if (openPlugin.value.type === 'block') {
      return plugins.value.find((v) => v.id === openPlugin.value?.id) ?? null
    } else if (openPlugin.value.type === 'host') {
      return (
        hostPlugins.value.find((v) => v.id === openPlugin.value?.id) ?? null
      )
    }
  }

  return null
})

function getPluginLabel(plugin: TransformPlugin | HostTransformPlugin): string {
  if (plugin.configInputs?.length) {
    return plugin.label + '...'
  }

  return plugin.label
}

function cancelTransform() {
  openPlugin.value = null
}

watch(selection.uuids, async () => {
  if (status.value === 'idle') {
    execute()
  }
})

watch(selection.hasHostSelected, () => {
  if (statusHostPlugins.value === 'idle') {
    executeHostPlugins()
  }
})

function mapValues(values: Record<string, any>): PluginConfigInputItem[] {
  return Object.entries(values).map(([name, value]) => {
    return {
      name,
      value,
    }
  })
}

function onSelectBlockTransformPlugin(
  plugin: TransformPlugin,
  uuids: string[],
) {
  if (plugin.configInputs?.length) {
    openPlugin.value = {
      type: 'block',
      id: plugin.id,
    }

    return
  }

  onTransformBlock(plugin, uuids, {})
}

function onSelectHostTransformPlugin(plugin: HostTransformPlugin) {
  if (plugin.configInputs?.length) {
    openPlugin.value = {
      type: 'host',
      id: plugin.id,
    }

    return
  }

  onTransformHost(plugin, {})
}

async function onTransformBlock(
  plugin: TransformPlugin,
  uuids: string[],
  values: Record<string, any>,
) {
  ui.setTransform(plugin.label)
  openPlugin.value = null

  await state.mutateWithLoadingState(
    () =>
      adapter.applyTransformPlugin({
        uuids,
        pluginId: plugin.id,
        config: mapValues(values),
      }),
    $t(
      'failedToTransform',
      'The action "@name" could not be executed.',
    ).replace('@name', plugin.label),
  )

  ui.setTransform()
}

function onSubmitDialog(values: Record<string, any>) {
  if (!openPluginDefinition.value) {
    return
  }

  if ('bundles' in openPluginDefinition.value) {
    onTransformBlock(openPluginDefinition.value, selection.uuids.value, values)
  } else {
    onTransformHost(openPluginDefinition.value, values)
  }
}

async function onTransformHost(
  plugin: HostTransformPlugin,
  values: Record<string, any>,
) {
  if (!adapter.applyHostTransformPlugin) {
    return
  }

  ui.setTransform(plugin.label)
  openPlugin.value = null

  await state.mutateWithLoadingState(
    () =>
      adapter.applyHostTransformPlugin({
        pluginId: plugin.id,
        config: mapValues(values),
      }),
    $t(
      'failedToTransform',
      'The action "@name" could not be executed.',
    ).replace('@name', plugin.label),
  )

  ui.setTransform()
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
    label: getPluginLabel(transform),
    group: 'selection',
    icon: 'script',
    callback: () => {
      onSelectBlockTransformPlugin(transform, selection.uuids.value)
    },
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
      if (
        !plugin.targetBundles ||
        plugin.targetBundles.includes(block.itemBundle)
      ) {
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

// @todo disabled for now because the interaction can be challenging when there's lots of transform plugins.

// defineDropAreas((dragItems) => {
//   const existing = dragItems.filter(
//     (v) => v.itemType === 'existing',
//   ) as DraggableExistingBlock[]
//
//   if (!existing.length) {
//     return
//   }
//
//   const uuids = existing.map((v) => v.uuid)
//
//   return getPossibleDropTransforms(
//     plugins.value,
//     dom.getAllBlocks(),
//     existing,
//   ).map<DropArea>((v) => {
//     return {
//       id: `transform:${v.plugin.id}:${v.block.uuid}`,
//       label: v.plugin.label,
//       element: v.block.element(),
//       onDrop: () => {
//         const transformUuids = [v.block.uuid, ...uuids]
//         return onSelectBlockTransformPlugin(v.plugin, transformUuids)
//       },
//     }
//   })
// })
</script>

<script lang="ts">
export default {
  name: 'Transform',
}
</script>
