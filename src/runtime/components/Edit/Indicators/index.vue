<template>
  <Teleport to="body">
    <div class="bk bk-indicators" :style>
      <div id="bk-indicators-left" />
      <div id="bk-indicators-right" />
      <div
        ref="elHovered"
        class="bk-indicators-hovered"
        :style="hoveredStyle"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { computed, useBlokkli, watch } from '#imports'

const { ui, dom, indicators } = useBlokkli()

const hoveredStyle = computed<Record<string, string | undefined>>(() => {
  if (indicators.hovered.value) {
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

const HEIGHT = 30

function snapToAnchorGrid(y: number): number {
  return Math.ceil(y / HEIGHT) * HEIGHT
}

const prevRects: Map<string, number> = new Map()
let lastFullUpdate = 0

onBlokkliEvent('animationFrame', function (ctx) {
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

watch(indicators.indicators, function () {
  prevRects.clear()
})

const style = computed(() => {
  const offset = ui.artboardOffset.value
  return {
    width: ui.artboardSize.value.width + 'px',
    height: ui.artboardSize.value.height + 'px',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${ui.artboardScale.value})`,
  }
})
</script>
