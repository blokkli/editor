<template>
  <div
    ref="el"
    :style="{
      visibility: isVisible ? 'visible' : 'hidden',
      '--bk-actions-max-width': `${paddedViewportWidth}px`,
    }"
    class="bk bk-blokkli-item-actions-inner absolute left-0 p-0 z-actions w-full text-mono-50 select-none text-sm pointer-events-auto"
    @mouseleave="onMouseLeave"
    @mouseenter="onMouseEnter"
  >
    <ScrollArrow
      v-show="showLeft"
      side="left"
      @start="startScroll(-1)"
      @end="stopScroll"
    />
    <div
      id="bk-blokkli-item-actions-controls"
      ref="contentEl"
      class="bk-blokkli-item-actions-controls flex items-stretch whitespace-nowrap h-full flex-wrap lg:flex-nowrap lg:w-max bg-mono-950/90 scheme-dark relative z-50 lg:border lg:border-mono-400 lg:bg-mono-900"
      :class="{
        'pointer-events-none': ui.isTransforming.value,
      }"
      :style="{ '--bk-actions-scroll-x': `${-scrollX}px` }"
    >
      <Interactions />
      <Title />

      <div
        v-show="!selection.hasHostSelected.value && !ui.isTransforming.value"
        id="bk-blokkli-item-actions"
        class="relative flex flex-1 lg:flex-initial lg:border-l lg:border-l-mono-500 justify-end"
      />
    </div>
    <ScrollArrow
      v-show="showRight"
      side="right"
      @start="startScroll(1)"
      @end="stopScroll"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, useTemplateRef, onBeforeUnmount } from '#imports'
import Interactions from './Interactions/index.vue'
import Title from './Title/index.vue'
import ScrollArrow from './ScrollArrow/index.vue'
import { onBlokkliEvent, useStickyToolbar } from '#blokkli/editor/composables'
import { useToolbarScroll } from './useToolbarScroll'

const { selection, ui } = useBlokkli()

const ACTIONS_HEIGHT = 52

const el = useTemplateRef('el')
const contentEl = useTemplateRef('contentEl')

const {
  scrollX,
  showLeft,
  showRight,
  startScroll,
  stopScroll,
  scrollIntoView,
} = useToolbarScroll({
  viewportEl: el,
  contentEl,
})

onBlokkliEvent('actions:scrollIntoView', (e) => {
  scrollIntoView(e.element)
})

useStickyToolbar(el, {
  getPlacementY: () => 'top',
  shouldUpdate: () => !ui.actionsToolbarLocked.value && isVisible.value,
  getHeight: () => ACTIONS_HEIGHT,
  getMargin: () => 30,
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

/**
 * Constrain the toolbar width to the editor's safe area — viewport minus left
 * toolbar, right sidebar, and the same padding useStickyToolbar already uses
 * for position clamping. With this cap in place and allowHorizontalOverflow
 * off, the toolbar is always fully visible; anything that doesn't fit becomes
 * scrollable via the arrow buttons.
 */
const paddedViewportWidth = computed(() =>
  Math.max(120, Math.round(ui.visibleViewportPadded.value.width)),
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
    backface-visibility: hidden;
    bottom: var(--bk-root-offset-bottom);
    @variant lg {
      @apply top-0! w-auto!;
      bottom: initial !important;
      max-width: var(--bk-actions-max-width, calc(100vw - 60px));
      /* Clip horizontal overflow at the toolbar's edges, but allow vertical
       * overflow in both directions so above-* tooltips and below-* group
       * popups render unclipped. Native overflow-x:auto would coerce
       * overflow-y to auto too and clip both — the transform-based scroll
       * inside sidesteps that. */
      clip-path: inset(-100vh 0 -100vh 0);
    }
  }

  .bk-blokkli-item-actions-controls {
    @variant lg {
      /* Transform is desktop-only. On mobile, applying any transform (even
       * translate3d(0,0,0)) would establish a containing block for fixed
       * descendants — that breaks the group popup's position:fixed layout.
       * No transition: selection changes must not animate scrollX back to
       * zero. Press-and-hold on the arrow buttons drives the scroll directly
       * via requestAnimationFrame. */
      transform: translate3d(var(--bk-actions-scroll-x, 0px), 0, 0);
      will-change: transform;
    }

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
