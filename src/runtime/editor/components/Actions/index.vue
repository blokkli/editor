<template>
  <div
    ref="el"
    :style="{
      visibility: isVisible ? 'visible' : 'hidden',
    }"
    class="bk bk-blokkli-item-actions-inner absolute left-0 p-0 z-actions w-full text-mono-50 select-none text-sm pointer-events-auto"
    @mouseleave="onMouseLeave"
    @mouseenter="onMouseEnter"
  >
    <div
      id="bk-blokkli-item-actions-controls"
      ref="controlsEl"
      class="bk-blokkli-item-actions-controls flex items-stretch whitespace-nowrap h-full flex-wrap lg:flex-nowrap bg-mono-950/90 scheme-dark relative z-50 lg:border lg:border-mono-400 lg:bg-mono-900"
      :class="{
        'pointer-events-none': ui.isTransforming.value,
      }"
    >
      <Interactions />
      <Title />

      <div
        v-show="!selection.hasHostSelected.value && !ui.isTransforming.value"
        id="bk-blokkli-item-actions"
        class="relative flex flex-1 lg:flex-initial lg:border-l lg:border-l-mono-500 justify-end"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, useTemplateRef, onBeforeUnmount } from '#imports'
import Interactions from './Interactions/index.vue'
import Title from './Title/index.vue'
import { useStickyToolbar } from '#blokkli/editor/composables'

const { selection, ui } = useBlokkli()

const ACTIONS_HEIGHT = 52

const el = useTemplateRef('el')

useStickyToolbar(el, {
  getPlacementY: () => 'top',
  shouldUpdate: () => !ui.actionsToolbarLocked.value && isVisible.value,
  getHeight: () => ACTIONS_HEIGHT,
  getMargin: () => 30,
  allowHorizontalOverflow: true,
})

let mouseLeaveTimeout: number | null = null

function onMouseLeave() {
  onMouseEnter()
  if (ui.actionsToolbarLocked.value || ui.isChangingOptions.value) {
    mouseLeaveTimeout = window.setTimeout(() => {
      ui.actionsToolbarLocked.value = false
      ui.isChangingOptions.value = false
    }, 500)
  }
}

function onMouseEnter() {
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
    mouseLeaveTimeout = null
  }
}

onBeforeUnmount(() => {
  if (mouseLeaveTimeout) {
    window.clearTimeout(mouseLeaveTimeout)
  }
})

const hasAnythingSelected = computed(
  () => selection.hasHostSelected.value || !!selection.items.value.length,
)

const isVisible = computed<boolean>(() => {
  return (
    !selection.isDragging.value &&
    !selection.activeFieldLabel.value &&
    !ui.isAnimating.value &&
    !ui.hasTransformOverlayOpen.value &&
    hasAnythingSelected.value &&
    !ui.hasTooltipOpen.value &&
    !ui.isApproving.value
  )
})
</script>

<script lang="ts">
export default {
  name: 'ItemActions',
}
</script>

<style lang="postcss">
.bk {
  &.bk-blokkli-item-actions-inner {
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    /* contain: layout style paint; */
    bottom: var(--bk-root-offset-bottom);
    @variant lg {
      @apply top-0 w-auto;
      bottom: initial;
    }
  }

  .bk-blokkli-item-actions-controls {
    &.bk-is-locked {
      @apply pointer-events-none;
      .bk-blokkli-item-actions-buttons > button,
      .bk-blokkli-item-options > .bk-blokkli-item-options-item {
        @apply opacity-20;
      }
    }

    &::-webkit-scrollbar {
      display: none;
    }
  }
}
</style>
