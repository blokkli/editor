<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <div class="bk">
      <BlokkliTransition name="command-palette">
        <Overlay v-if="isVisible" @close="isVisible = false" />
      </BlokkliTransition>
    </div>
  </Teleport>

  <PluginToolbarButton
    id="workspace"
    :title="$t('workspaceOpen', 'Switch page')"
    meta
    key-code="P"
    no-command
    region="title"
    weight="500"
    icon="bk_mdi_feature_search"
    class="relative"
    @click="isVisible = !isVisible"
  />
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  defineBlokkliFeature,
  defineAsyncComponent,
} from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import { onBlokkliEvent, useDialog } from '#blokkli/editor/composables'

const Overlay = defineAsyncComponent(() => import('./Overlay/index.vue'))

defineBlokkliFeature({
  id: 'workspace',
  icon: 'bk_mdi_workspaces',
  label: 'Workspace',
  description: 'Allows users to switch between edit states.',
  requiredAdapterMethods: ['getHostEntities'],
})

const { $t, ui } = useBlokkli()

const isVisible = useDialog('workspace', 'center')

onBlokkliEvent('window:clickAway', () => (isVisible.value = false))
</script>

<script lang="ts">
export default {
  name: 'Workspace',
}
</script>
