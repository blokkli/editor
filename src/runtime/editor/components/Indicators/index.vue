<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      id="bk-indicators"
      class="bk bk-indicators absolute top-0 left-0 pointer-events-none origin-top-left z-interaction-overlay"
      :style
    >
      <div
        id="bk-indicators-left"
        class="absolute right-full top-0 whitespace-nowrap h-full"
      />
      <div id="bk-indicators-right" />
      <div
        class="bk-indicators-hovered absolute top-0 left-0 bg-red-normal/30 rounded border-3 border-red-normal"
        :style="hoveredStyle"
      />
      <div
        class="bk-indicators-highlighted absolute top-0 left-0 rounded border-3 border-accent-500 ring-4 ring-accent-300 outline outline-white"
        :style="highlightedStyle"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useBlokkli, watch, ref } from '#imports'
import type { StyleValue } from 'vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type { Rectangle } from '#blokkli/editor/types/geometry'

const { ui, dom, indicators, selection } = useBlokkli()

const artboardElement = ui.artboardElement()

const highlighted = ref<Rectangle | null>(null)

const hasIndicators = computed<boolean>(
  () => !!indicators.indicators.value.length || !!highlighted.value,
)

const style = computed<StyleValue>(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})

const hoveredStyle = computed<StyleValue>(() => {
  if (indicators.hovered.value && hasIndicators.value) {
    const rect = dom.getBlockRect(indicators.hovered.value, true)
    if (rect) {
      return {
        width: rect.width.toString() + 'px',
        height: rect.height.toString() + 'px',
        transform: `translate(${rect.x}px, ${rect.y}px)`,
      }
    }
  }

  return {
    visibility: 'hidden',
  }
})

const highlightedStyle = computed<StyleValue>(() => {
  if (highlighted.value) {
    return {
      width: highlighted.value.width.toString() + 'px',
      height: highlighted.value.height.toString() + 'px',
      transform: `translate(${highlighted.value.x}px, ${highlighted.value.y}px)`,
    }
  }
  return {
    visibility: 'hidden',
  }
})

const HEIGHT = 30

/**
 * How far (in artboard units) a sticky indicator is shifted onto the
 * artboard when clamped, so that the icon at its right end stays visible.
 */
const STICKY_RESERVED = 35

function snapToAnchorGrid(y: number): number {
  return Math.ceil(y / HEIGHT) * HEIGHT
}

const prevTransforms: Map<string, string> = new Map()
let lastFullUpdate = 0

onBlokkliEvent('animationFrame', function (ctx) {
  if (!hasIndicators.value) {
    return
  }

  const items = indicators.indicators.value

  const taken = new Set<number>()

  const forceRefresh = ctx.time - lastFullUpdate > 1000

  // The X translation (in artboard units) needed so that the right edge of
  // a sticky indicator stays inside the visible viewport.
  const stickyX = Math.max(
    0,
    (ui.visibleViewport.value.x - ui.artboardOffset.value.x) /
      ui.artboardScale.value +
      STICKY_RESERVED,
  )

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) {
      continue
    }

    const rect = dom.getBlockRect(item.uuid, forceRefresh)
    if (!rect) {
      prevTransforms.delete(item.uuid)
      continue
    }
    let y = snapToAnchorGrid(Math.round(rect.y))

    while (taken.has(y)) {
      y += HEIGHT
    }

    taken.add(y)

    const x = item.sticky && item.position === 'left' ? stickyX : 0

    const style = `translate(${x}px, ${y}px)`
    if (prevTransforms.get(item.uuid) !== style) {
      prevTransforms.set(item.uuid, style)
      item.element.style.transform = style
    }
  }

  if (forceRefresh) {
    lastFullUpdate = ctx.time
  }
})

onBlokkliEvent('view-option:toggle', () => {
  prevTransforms.clear()
})

onBlokkliEvent('state:reloaded', () => {
  prevTransforms.clear()
})

function highlightElement(element: HTMLElement) {
  if (artboardElement.contains(element)) {
    highlighted.value = ui.getAbsoluteElementRect(element)
  } else {
    highlighted.value = {
      x: 0,
      y: 0,
      width: ui.artboardSize.value.width,
      height: ui.artboardSize.value.height,
    }
  }
}

onBlokkliEvent('scrollIntoView', (e) => {
  if ('element' in e && e.highlight) {
    highlightElement(e.element)
  }
})

onBlokkliEvent('highlight', (element) => {
  if (!element) {
    highlighted.value = null
    return
  }
  highlightElement(element)
})

onBlokkliEvent('window:clickAway', function () {
  highlighted.value = null
})

watch(indicators.indicators, function () {
  prevTransforms.clear()
})

watch(selection.uuids, function () {
  highlighted.value = null
})
</script>
