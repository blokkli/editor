<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="transform-overlay">
      <TransformDialog
        v-if="openPluginDefinition"
        :plugin="openPluginDefinition"
        :uuids="selectedUuids"
        @cancel="cancelTransform"
        @submit="onSubmitDialog"
      />
    </BlokkliTransition>
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
import { BlokkliTransition } from '#blokkli/editor/components'
import TransformDialog from './Dialog/index.vue'
import { defineCommands, defineItemDropdownAction } from '#blokkli/editor/composables'
import type { HostTransformPlugin, TransformPlugin } from './types'
import type { PluginConfigInputItem } from '#blokkli/editor/types/pluginConfig'

function filterTransforms(
  plugins: TransformPlugin[],
  selectedItems: any[],
  selectedBundles: string[],
  allowedBundles: string[],
): TransformPlugin[] {
  return plugins.filter((plugin) => {
    if (selectedItems.length < plugin.min) {
      return false
    }

    if (plugin.max !== -1 && selectedItems.length > plugin.max) {
      return false
    }

    // Check that the target bundles of the transform plugin are all allowed in the current field list.
    // If no targetBundles are defined, the plugin is available too, assuming that the plugin does not
    // add any blocks in the process.
    const allAllowedInList =
      !plugin.targetBundles ||
      plugin.targetBundles.every((bundle) => allowedBundles.includes(bundle))
    if (!allAllowedInList) {
      return false
    }

    // Filter for supported bundles.
    return selectedBundles.every((bundle) => plugin.bundles.includes(bundle))
  })
}

const { adapter } = defineBlokkliFeature({
  id: 'transform',
  icon: 'bk_mdi_function',
  label: 'Transform',
  requiredAdapterMethods: ['getTransformPlugins', 'applyTransformPlugin'],
  description: 'Provides integration for block transform plugins.',
  screenshot: 'feature-transform.jpg',
})

type TransformType = 'block' | 'host'

const { types, selection, state, $t, ui } = useBlokkli()

const openPlugin = ref<{
  type: TransformType
  id: string
} | null>(null)
const selectedUuids = ref<string[]>([])

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
  selectedUuids.value = []
  state.clearOverrideState()
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

function onSelectBlockTransformPlugin(
  plugin: TransformPlugin,
  uuids: string[],
) {
  if (plugin.configInputs?.length) {
    openPlugin.value = {
      type: 'block',
      id: plugin.id,
    }
    selectedUuids.value = [...selection.uuids.value]

    return
  }

  onTransformBlock(plugin, uuids, [])
}

function onSelectHostTransformPlugin(plugin: HostTransformPlugin) {
  if (plugin.configInputs?.length) {
    openPlugin.value = {
      type: 'host',
      id: plugin.id,
    }

    return
  }

  onTransformHost(plugin, [])
}

async function onTransformBlock(
  plugin: TransformPlugin,
  uuids: string[],
  values: PluginConfigInputItem[],
) {
  ui.setTransform(plugin.label)
  openPlugin.value = null

  await state.mutateWithLoadingState(
    () =>
      adapter.applyTransformPlugin({
        uuids,
        pluginId: plugin.id,
        config: values,
      }),
    $t(
      'failedToTransform',
      'The action "@name" could not be executed.',
    ).replace('@name', plugin.label),
  )

  ui.setTransform()
}

function onSubmitDialog(values: PluginConfigInputItem[]) {
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
  values: PluginConfigInputItem[],
) {
  if (!adapter.applyHostTransformPlugin) {
    return
  }

  ui.setTransform(plugin.label)
  openPlugin.value = null

  await state.mutateWithLoadingState(
    () =>
      adapter.applyHostTransformPlugin!({
        pluginId: plugin.id,
        config: values,
      }),
    $t(
      'failedToTransform',
      'The action "@name" could not be executed.',
    ).replace('@name', plugin.label),
  )

  ui.setTransform()
}

const possibleTransforms = computed<TransformPlugin[]>(() =>
  filterTransforms(
    plugins.value || [],
    selection.uuids.value,
    selection.bundles.value,
    types.allowedTypesInList.value,
  ),
)

defineCommands(() =>
  possibleTransforms.value.map((transform) => ({
    id: 'transform:' + transform.id,
    label: getPluginLabel(transform),
    group: 'selection',
    icon: 'bk_mdi_function',
    callback: () => {
      onSelectBlockTransformPlugin(transform, selection.uuids.value)
    },
  })),
)

defineItemDropdownAction(() => {
  if (possibleTransforms.value.length) {
    return possibleTransforms.value.map((transform) => ({
      id: 'transform-block-' + transform.id,
      label: transform.label,
      icon: 'bk_mdi_function',
      group: 'transform',
      weight: 100,
      callback: () => {
        onSelectBlockTransformPlugin(transform, selection.uuids.value)
      },
    }))
  }
})

defineItemDropdownAction(() => {
  if (
    selection.hasHostSelected.value &&
    hostPlugins.value &&
    hostPlugins.value.length
  ) {
    return hostPlugins.value.map((plugin) => ({
      id: 'transform-host-' + plugin.id,
      label: plugin.label,
      icon: 'bk_mdi_function',
      group: 'transform',
      weight: 100,
      callback: () => {
        onSelectHostTransformPlugin(plugin)
      },
    }))
  }
})
</script>

<script lang="ts">
export default {
  name: 'Transform',
}
</script>
