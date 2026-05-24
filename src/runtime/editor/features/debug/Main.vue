<template>
  <PluginSidebar id="debug" title="Debug" icon="bk_mdi_bug_report" weight="200">
    <div class="bk-debug">
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

      <DebugSection title="Test Cases">
        <SectionTestCases />
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
import { PluginSidebar, PluginDebugOverlay } from '#blokkli/editor/plugins'
import DebugSection from './DebugSection.vue'
import SectionKeyboard from './Section/Keyboard.vue'
import SectionSelection from './Section/Selection.vue'
import SectionRendering from './Section/Rendering.vue'
import SectionLogging from './Section/Logging.vue'
import SectionIcons from './Section/Icons.vue'
import SectionFeatures from './Section/Features.vue'
import SectionTestCases from './Section/TestCases.vue'
import DebugViewport from './Viewport/index.vue'
import DebugRects from './Rects/index.vue'
import type { DebugLogger } from '#blokkli/editor/providers/debug'
import { defineItemDropdownAction } from '#blokkli/editor/composables'

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

<style lang="postcss">
.bk .bk-debug {
  .bk-debug-section {
    @apply border-b border-b-mono-300;
  }

  .bk-debug-section-header {
    @apply cursor-pointer select-none flex items-center gap-5;
    @apply font-semibold uppercase text-sm p-20;
    &:hover {
      @apply opacity-80;
    }
  }

  .bk-debug-section-content {
    @apply px-20 pb-20;
  }

  .bk-debug-section-indicator {
    @apply inline-block w-15 text-xs;
  }

  .bk-debug-list {
    > div {
      @apply flex justify-between;
      &:not(:last-child) {
        @apply mb-5;
      }
    }
  }

  .bk-debug-features {
    h3 {
      @apply font-bold;
    }

    p {
      @apply text-sm;
    }

    > div {
      @apply flex gap-5 py-10 border-b border-b-mono-300;
    }
  }
}

.bk {
  .bk-debug-visible-viewport {
    @apply fixed bg-red-normal/10 border-red-normal border-3 z-[999999999999] pointer-events-none;
    > div {
      @apply bg-red-normal text-xs p-2 text-white absolute top-0 left-0;
    }
  }

  .bk-debug-intersection-rects {
    @apply fixed bg-yellow-normal/25 z-[999999999999] pointer-events-none;
    @apply outline outline-yellow-normal -outline-offset-1;
  }

  .bk-debug-visible-viewport-padded {
    @apply fixed border-red-normal border-3 z-[9999999] pointer-events-none;
    > div {
      @apply bg-red-normal text-xs p-2 text-white absolute top-0 left-0;
    }
  }

  .bk-debug-viewport-blocking-rect {
    @apply fixed border-red-normal border-3 z-[9999999] pointer-events-none;
  }

  .bk-debug-viewport-lines {
    @apply fixed bg-lime-normal z-[999999999999] pointer-events-none;
  }

  .debug-rect {
    @apply fixed bg-accent-700/10 border border-accent-700 z-[999999999999] pointer-events-none;
  }

  .bk-debug-icons {
    @apply grid grid-cols-4 gap-15 text-xs text-center;

    .bk-icon {
      @apply p-10;
    }

    svg {
      @apply w-full aspect-square h-auto;
    }
  }

  .bk-debug-rects {
    @apply fixed top-0 left-0 w-full h-full pointer-events-none z-[99999999999];
  }
}
</style>
