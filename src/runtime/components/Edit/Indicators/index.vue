<template>
  <Teleport to="body">
    <div class="bk bk-indicators" :style id="bk-indicators">
      <div id="bk-indicators-left" />
      <div id="bk-indicators-right" />
      <div class="bk-indicators-hovered" :style="hoveredStyle" />
      <div class="bk-indicators-highlighted" :style="highlightedStyle" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Rectangle } from '#blokkli/types'
import { computed, useBlokkli, watch, ref } from '#imports'
import type { StyleValue } from 'vue'

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

function snapToAnchorGrid(y: number): number {
  return Math.ceil(y / HEIGHT) * HEIGHT
}

const prevRects: Map<string, number> = new Map()
let lastFullUpdate = 0

onBlokkliEvent('animationFrame', function (ctx) {
  if (!hasIndicators.value) {
    return
  }

  const items = indicators.indicators.value

  const taken = new Set<number>()

  const forceRefresh = ctx.time - lastFullUpdate > 1000

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item) {
      continue
    }

    const rect = dom.getBlockRect(item.uuid, forceRefresh)
    if (!rect) {
      prevRects.delete(item.uuid)
      continue
    }
    let y = snapToAnchorGrid(Math.round(rect.y))

    while (taken.has(y)) {
      y += HEIGHT
    }

    taken.add(y)

    const style = `translateY(${y}px)`
    if (prevRects.get(item.uuid) !== y) {
      prevRects.set(item.uuid, y)
      item.element.style.transform = style
    }
  }

  if (forceRefresh) {
    lastFullUpdate = ctx.time
  }
})

onBlokkliEvent('view-option:toggle', () => {
  prevRects.clear()
})

onBlokkliEvent('state:reloaded', () => {
  prevRects.clear()
})

onBlokkliEvent('scrollIntoView', (e) => {
  if ('element' in e) {
    if (artboardElement.contains(e.element)) {
      highlighted.value = ui.getAbsoluteElementRect(e.element)
    } else {
      highlighted.value = {
        x: 0,
        y: 0,
        width: ui.artboardSize.value.width,
        height: ui.artboardSize.value.height,
      }
    }
  }
})

onBlokkliEvent('window:clickAway', function () {
  highlighted.value = null
})

watch(indicators.indicators, function () {
  prevRects.clear()
})

watch(selection.uuids, function () {
  highlighted.value = null
})
</script>
