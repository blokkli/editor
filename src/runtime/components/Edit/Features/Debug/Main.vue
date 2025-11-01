<template>
  <PluginSidebar id="debug" title="Debug" icon="bug" weight="200">
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

  <PluginItemDropdown
    v-if="itemDropdownItems.length"
    id="selection"
    :title="$t('selectionActionGroupTitle', 'Selection')"
    enabled
    :items="itemDropdownItems"
    icon="bug"
    weight="200"
    @select="onSelectDropdownItem"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import {
  PluginSidebar,
  PluginDebugOverlay,
  PluginItemDropdown,
} from '#blokkli/plugins'
import DebugSection from './DebugSection.vue'
import SectionKeyboard from './Section/Keyboard.vue'
import SectionSelection from './Section/Selection.vue'
import SectionRendering from './Section/Rendering.vue'
import SectionLogging from './Section/Logging.vue'
import SectionIcons from './Section/Icons.vue'
import SectionFeatures from './Section/Features.vue'
import DebugViewport from './Viewport/index.vue'
import DebugRects from './Rects/index.vue'
import type { DebugLogger } from '#blokkli/helpers/debugProvider'

defineProps<{
  logger: DebugLogger
}>()

const { selection, $t } = useBlokkli()

const itemDropdownItems = computed(() => {
  if (selection.uuids.value.length === 1) {
    return [
      {
        id: 'copy-uuid',
        label: 'Copy UUID',
      },
    ]
  }
  return []
})

async function onSelectDropdownItem(item: { id: string }) {
  if (item.id === 'copy-uuid') {
    const type = 'text/plain'
    const clipboardItemData = {
      [type]: selection.uuids.value.at(0) ?? '',
    }
    const clipboardItem = new ClipboardItem(clipboardItemData)
    await navigator.clipboard.write([clipboardItem])
  }
}
</script>
