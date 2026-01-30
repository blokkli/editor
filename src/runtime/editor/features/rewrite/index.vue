<template>
  <PluginItemAction
    id="rewrite"
    edit-only
    :title="$t('rewriteAction', 'Rewrite with AI')"
    icon="stars"
    multiple
    :weight="-5000"
    class="bk-is-rewrite"
    @click="onClick"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="caret-tooltip">
      <RewriteForm
        v-if="isOpen"
        :uuids="selectedUuids"
        :adapters="adapters"
        @close="onClose"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import { PluginItemAction } from '#blokkli/editor/plugins'
import RewriteForm from './Form/index.vue'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

const { adapters } = defineBlokkliFeature({
  id: 'rewrite',
  icon: 'robot',
  label: 'AI Rewrite',
  description: 'Rewrite selected blocks using AI.',
})

const { selection, $t, ui } = useBlokkli()

const isOpen = ref(false)
const selectedUuids = ref<string[]>([])

function hasAdapterMethods() {
  // Check base adapter
  if (adapters.adapter.streamRewrite && adapters.adapter.applyRewrite) {
    return true
  }
  // Check extensions
  let hasStream = !!adapters.adapter.streamRewrite
  let hasApply = !!adapters.adapter.applyRewrite
  for (const ext of adapters.extensions) {
    if (ext.methods.streamRewrite) hasStream = true
    if (ext.methods.applyRewrite) hasApply = true
  }
  return hasStream && hasApply
}

const canRewrite = computed(() => {
  if (!hasAdapterMethods()) {
    return false
  }

  const uuids = selection.uuids.value
  if (!uuids.length) return false

  return true
})

function onClose() {
  isOpen.value = false
  selectedUuids.value = []
  selection.unlockSelection('rewrite')
}

function onClick(items: RenderedFieldListItem[]) {
  if (!items.length || !canRewrite.value) {
    return
  }
  selectedUuids.value = items.map((item) => item.uuid)
  isOpen.value = true
  selection.lockSelection('rewrite')
}
</script>

<script lang="ts">
export default {
  name: 'Rewrite',
}
</script>
