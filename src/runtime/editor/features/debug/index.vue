<template>
  <DebugMain v-if="debug.isEnabled.value" :logger />
</template>

<script lang="ts" setup>
import {
  defineAsyncComponent,
  defineBlokkliFeature,
  useBlokkli,
} from '#imports'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const DebugMain = defineAsyncComponent(() => import('./Main.vue'))

const { logger } = defineBlokkliFeature({
  id: 'debug',
  label: 'Debug',
  icon: 'bk_mdi_bug_report',
  description: 'Provides debugging functionality.',
})

const { debug, ui } = useBlokkli()

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value || ui.hasNestedEditorOpen.value) {
    return
  }

  if (e.code === '=' && e.meta) {
    e.originalEvent.preventDefault()
    debug.toggle()
  }
})
</script>

<script lang="ts">
export default {
  name: 'Debug',
}
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
