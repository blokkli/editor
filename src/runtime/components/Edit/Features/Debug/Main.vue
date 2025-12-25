<template>
  <PluginSidebar id="debug" title="Debug" icon="bk_mdi_bug_report" weight="200">
    <div class="bk bk-debug">
      <DebugSection title="Keyboard">
        <SectionKeyboard />
      </DebugSection>

      <DebugSection title="Selection">
        <SectionSelection />
      </DebugSection>

      <DebugSection title="Rendering">
        <SectionRendering />
      </DebugSection>

      <DebugSection title="Logging">
        <SectionLogging :logger />
      </DebugSection>

      <DebugSection title="Icons">
        <SectionIcons />
      </DebugSection>

      <DebugSection title="Features">
        <SectionFeatures />
      </DebugSection>
    </div>
  </PluginSidebar>

  <PluginDebugOverlay id="viewport" title="Show viewport overlay">
    <DebugViewport />
  </PluginDebugOverlay>

  <PluginDebugOverlay id="rects" title="Show field and block rects">
    <DebugRects />
  </PluginDebugOverlay>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { PluginSidebar, PluginDebugOverlay } from '#blokkli/plugins'
import DebugSection from './DebugSection.vue'
import SectionKeyboard from './Section/Keyboard.vue'
import SectionSelection from './Section/Selection.vue'
import SectionRendering from './Section/Rendering.vue'
import SectionLogging from './Section/Logging.vue'
import SectionIcons from './Section/Icons.vue'
import SectionFeatures from './Section/Features.vue'
import DebugViewport from './Viewport/index.vue'
import DebugRects from './Rects/index.vue'
import type { DebugLogger } from '#blokkli/helpers/providers/debug'
import defineItemDropdownAction from '#blokkli/helpers/composables/defineItemDropdownAction'

defineProps<{
  logger: DebugLogger
}>()

const { selection } = useBlokkli()

async function copyUuid() {
  const uuid = selection.uuids.value.at(0)
  if (!uuid) {
    return
  }
  const type = 'text/plain'
  const clipboardItemData = {
    [type]: uuid,
  }
  const clipboardItem = new ClipboardItem(clipboardItemData)
  await navigator.clipboard.write([clipboardItem])
}

defineItemDropdownAction(() => {
  if (selection.uuids.value.length === 1) {
    return {
      id: 'debug-copy-uuid',
      label: 'Copy UUID',
      icon: 'bk_mdi_bug_report',
      group: 'debug',
      weight: 200,
      callback: copyUuid,
    }
  }
})
</script>
