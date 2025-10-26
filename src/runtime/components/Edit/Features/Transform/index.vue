<template>
  <PluginItemDropdown
    id="transform"
    :title="$t('transformTo', 'Actions')"
    :enabled="!!possibleTransforms.length"
    :items="possibleTransforms"
    icon="script"
    weight="100"
    @select="onSelectBlockTransformPlugin($event, selection.uuids.value)"
  />

  <PluginItemDropdown
    v-if="hostPlugins.length"
    id="transform-host"
    :title="$t('transformTo', 'Actions')"
    :enabled="selection.hasHostSelected.value"
    :items="hostPlugins"
    icon="script"
    weight="100"
    @select="onSelectHostTransformPlugin($event)"
  />

  <Teleport to="body">
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
import { PluginItemDropdown } from '#blokkli/plugins'
import type {
  HostTransformPlugin,
  PluginConfigInputItem,
  TransformPlugin,
} from '#blokkli/types'
import { BlokkliTransition } from '#blokkli/components'
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
    icon: 'script',
    callback: () => {
      onSelectBlockTransformPlugin(transform, selection.uuids.value)
    },
  })),
)
</script>

<script lang="ts">
export default {
  name: 'Transform',
}
</script>
