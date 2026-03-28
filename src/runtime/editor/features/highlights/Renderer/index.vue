<template>
  <Teleport to="#bk-canvas-overlay">
    <div
      v-if="tooltipHighlights.length"
      v-show="showTooltip"
      class="bk fixed top-0 left-0 z-analyze-tooltip flex flex-row -mt-25 shadow-lg"
      :style="{
        transform: `translate(${tooltipPosition.x}px, ${tooltipPosition.y}px)`,
      }"
      @pointerenter="isTooltipHovered = true"
      @pointerleave="isTooltipHovered = false"
    >
      <button
        v-for="(highlight, i) in tooltipHighlights"
        :key="i"
        class="cursor-pointer relative flex items-center gap-5 px-8 h-25 text-xs font-semibold whitespace-nowrap bg-scheme-normal text-scheme-text first:rounded-l last:rounded-r bk-highlight-tooltip-item"
        :class="'bk-scheme-' + highlight.color"
        @click.prevent="onTooltipItemClick(highlight)"
      >
        <Icon :name="highlight.icon" class="size-15" />
        <span>{{ highlight.label }}</span>
        <div v-if="highlight.description" class="bk-tooltip">
          {{ highlight.description }}
        </div>
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, computed, ref } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  type BufferInfo,
  setUniforms,
  createBufferInfoFromArrays,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/editor/helpers/webgl'
import { toShaderColor } from '#blokkli/editor/helpers/color'
import { defineRenderer, onBlokkliEvent } from '#blokkli/editor/composables'
import type { Rectangle } from '#blokkli/editor/types/geometry'
import type { HighlightItem } from '#blokkli/editor/providers/plugin'
import type { RGB } from '../../../../../global/types/theme'
import { Icon } from '#blokkli/editor/components'

const { animation, ui, theme, selection, plugins, dom, blocks, state } =
  useBlokkli()

const showTooltip = computed(() => {
  return (
    !ui.isChangingOptions.value &&
    !selection.isMultiSelecting.value &&
    !selection.activeEditableLabel.value &&
    !selection.isDragging.value
  )
})

const COLOR_PRIORITY: Record<string, number> = {
  red: 2,
  yellow: 1,
}

type HighlightRectangle = Rectangle & {
  id: string
  index: number
}

type ResolvedHighlightGroup = {
  element: HTMLElement
  highlights: HighlightItem[]
  uuids: string[]
  color1: RGB
  color2: RGB
}

function resolveHighlightElement(item: HighlightItem): HTMLElement | null {
  if (item.element) {
    return item.element
  }
  if (item.uuid) {
    const block = blocks.getBlock(item.uuid)
    if (block) {
      return dom.getDragElement(block) ?? null
    }
  }
  return null
}

function getColorsForGroup(highlights: HighlightItem[]): [RGB, RGB] {
  const uniqueColors = [...new Set(highlights.map((h) => h.color))].sort(
    (a, b) => (COLOR_PRIORITY[b] || 0) - (COLOR_PRIORITY[a] || 0),
  )

  const color1 = colorToRGB(uniqueColors[0]!)
  const color2 = uniqueColors.length > 1 ? colorToRGB(uniqueColors[1]!) : color1

  return [color1, color2]
}

function colorToRGB(color: string): RGB {
  if (color === 'red') {
    return theme.red.value.normal
  }
  return theme.yellow.value.normal
}

const groups = computed<ResolvedHighlightGroup[]>(() => {
  const allHighlights = plugins.get('highlight')
  const elementMap = new Map<HTMLElement, HighlightItem[]>()

  for (const highlight of allHighlights) {
    const el = resolveHighlightElement(highlight)
    if (!el) {
      continue
    }
    const existing = elementMap.get(el)
    if (existing) {
      existing.push(highlight)
    } else {
      elementMap.set(el, [highlight])
    }
  }

  const result: ResolvedHighlightGroup[] = []
  for (const [element, highlights] of elementMap) {
    const [color1, color2] = getColorsForGroup(highlights)
    const uuids = [
      ...new Set(highlights.map((h) => h.uuid).filter((u): u is string => !!u)),
    ]
    result.push({ element, highlights, uuids, color1, color2 })
  }

  return result
})

class HighlightsRectangleBufferCollector extends RectangleBufferCollector<HighlightRectangle> {
  prevKey = ''
  rectCache = new Map<HTMLElement, Rectangle | null>()
  color1Data: number[] = []
  color2Data: number[] = []

  clearCache() {
    this.rectCache.clear()
    this.prevKey = ''
  }

  override reset() {
    super.reset()
    this.color1Data = []
    this.color2Data = []
  }

  addHighlightRectangle(
    rect: Omit<HighlightRectangle, 'index'>,
    color1: RGB,
    color2: RGB,
  ) {
    this.addRectangle(rect, 0)

    // Add per-vertex color data (4 vertices per rect).
    const c1 = toShaderColor(color1)
    const c2 = toShaderColor(color2)
    for (let v = 0; v < 4; v++) {
      this.color1Data.push(c1[0], c1[1], c1[2])
      this.color2Data.push(c2[0], c2[1], c2[2])
    }
  }

  override createBufferInfo(gl: WebGLRenderingContext): BufferInfo {
    return createBufferInfoFromArrays(gl, {
      a_position: {
        numComponents: 3,
        data: this.positions,
        type: gl.FLOAT,
      },
      a_rect_id: {
        numComponents: 1,
        data: this.rectId,
        type: gl.FLOAT,
      },
      a_state: {
        numComponents: 1,
        data: this.state,
        type: gl.FLOAT,
      },
      a_rect_type: {
        numComponents: 1,
        data: this.types,
        type: gl.FLOAT,
      },
      a_rect_radius: {
        numComponents: 4,
        data: this.radius,
        type: gl.FLOAT,
      },
      a_quad: {
        numComponents: 4,
        data: this.quad,
        type: gl.FLOAT,
      },
      a_color1: {
        numComponents: 3,
        data: this.color1Data,
        type: gl.FLOAT,
      },
      a_color2: {
        numComponents: 3,
        data: this.color2Data,
        type: gl.FLOAT,
      },
      indices: this.indices,
    })
  }

  getBufferInfo(
    gl?: WebGLRenderingContext,
    force?: boolean,
  ): {
    info: BufferInfo | null
    hasChanged: boolean
  } {
    const key = groups.value
      .map((group, index) => {
        if (!this.rectCache.has(group.element)) {
          const rect = ui.getAbsoluteElementRect(group.element)
          this.rectCache.set(group.element, rect)
        }

        const rect = this.rectCache.get(group.element)
        if (!rect) {
          return `${index}_no_rect`
        }

        const colors = group.highlights.map((h) => h.color).join(',')

        return `${index}_${rect.x}_${rect.y}_${rect.width}_${rect.height}_${colors}`
      })
      .join('_')

    const hasChanged = force || this.prevKey !== key

    if (hasChanged) {
      this.reset()

      for (let i = 0; i < groups.value.length; i++) {
        const group = groups.value[i]!
        const id = `highlight_${i}`

        if (this.added.has(id)) {
          continue
        }

        const rect = this.rectCache.get(group.element)
        if (!rect) {
          continue
        }

        this.addHighlightRectangle(
          {
            id,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          group.color1,
          group.color2,
        )
      }

      this.prevKey = key
    }

    if (hasChanged && gl) {
      this.bufferInfo = this.createBufferInfo(gl)
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

const { collector } = defineRenderer('highlights-overlay', {
  zIndex: 500,
  collector: () => new HighlightsRectangleBufferCollector(),
  program: () => ({ shaders: [vs, fs] }),
  enabled: () =>
    !selection.isMultiSelecting.value &&
    !selection.isDragging.value &&
    !ui.isChangingOptions.value &&
    !selection.activeEditableLabel.value,
  render: (_ctx, gl, program) => {
    gl.useProgram(program.program)

    const { info } = collector.getBufferInfo(gl)

    if (!info) {
      return
    }

    setUniforms(program, {
      u_opacity: 1.0,
    })
    animation.setSharedUniforms(gl, program)

    setBuffersAndAttributes(gl, program, info)
    drawBufferInfo(gl, info, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    collector.getBufferInfo()

    if (groups.value.length === 0) {
      return
    }

    const borderRadius = 4 * ctx.dpi
    const lineWidth = 2 * ctx.dpi

    for (let i = 0; i < groups.value.length; i++) {
      const group = groups.value[i]!
      const rect = collector.rectCache.get(group.element)
      if (!rect) {
        continue
      }

      const x = (rect.x * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi
      const y = (rect.y * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi
      const width = rect.width * ctx.artboardScale * ctx.dpi
      const height = rect.height * ctx.artboardScale * ctx.dpi

      ctx2d.lineWidth = lineWidth
      ctx2d.strokeStyle = `rgb(${group.color1[0]}, ${group.color1[1]}, ${group.color1[2]})`
      ctx2d.beginPath()
      ctx2d.roundRect(x, y, width, height, borderRadius)
      ctx2d.stroke()
    }
  },
})

onBlokkliEvent('ui:resized', function () {
  collector.clearCache()
  collector.reset()
})

onBlokkliEvent('option:finish-change', () => {
  collector.clearCache()
  collector.reset()
})

// Hover detection.
const hoveredGroupIndex = ref<number | null>(null)
const isTooltipHovered = ref(false)
let hideTimeout: number | null = null

function setHoveredGroup(index: number | null) {
  if (index !== null) {
    if (hideTimeout) {
      window.clearTimeout(hideTimeout)
      hideTimeout = null
    }
    hoveredGroupIndex.value = index
  } else if (hoveredGroupIndex.value !== null && !hideTimeout) {
    hideTimeout = window.setTimeout(() => {
      hideTimeout = null
      if (!isTooltipHovered.value) {
        hoveredGroupIndex.value = null
      }
    }, 200)
  }
}

const tooltipHighlights = computed<HighlightItem[]>(() => {
  if (hoveredGroupIndex.value === null) {
    return []
  }
  const group = groups.value[hoveredGroupIndex.value]
  return group ? group.highlights : []
})

const tooltipPosition = computed<{ x: number; y: number }>(() => {
  if (hoveredGroupIndex.value === null) {
    return { x: 0, y: 0 }
  }
  const group = groups.value[hoveredGroupIndex.value]
  if (!group) {
    return { x: 0, y: 0 }
  }
  const rect = collector.rectCache.get(group.element)
  if (!rect) {
    return { x: 0, y: 0 }
  }
  const scale = ui.artboardScale.value
  const offset = ui.artboardOffset.value
  return {
    x: rect.x * scale + offset.x,
    y: rect.y * scale + offset.y,
  }
})

function onTooltipItemClick(highlight: HighlightItem) {
  highlight.onClick()
}

onBlokkliEvent('canvas:draw', (e) => {
  const artboardX = (e.mouseX - e.artboardOffset.x) / e.artboardScale
  const artboardY = (e.mouseY - e.artboardOffset.y) / e.artboardScale

  // If the mouse is over the tooltip DOM element, keep the current hover.
  if (isTooltipHovered.value) {
    return
  }

  // Find all matching groups and pick the deepest/most specific one.
  // Prefer isChildOf for hierarchy, fall back to smallest area for same-block targets.
  let bestIndex: number | null = null
  let bestUuid: string | null = null
  let bestArea = Infinity

  for (let i = 0; i < groups.value.length; i++) {
    const group = groups.value[i]!
    const rect = collector.rectCache.get(group.element)
    if (!rect) {
      continue
    }

    if (
      artboardX >= rect.x &&
      artboardX <= rect.x + rect.width &&
      artboardY >= rect.y &&
      artboardY <= rect.y + rect.height
    ) {
      if (bestIndex === null) {
        bestIndex = i
        bestUuid = group.uuids[0] ?? null
        bestArea = rect.width * rect.height
        continue
      }

      const uuid = group.uuids[0]

      // Different blocks: use hierarchy check.
      if (uuid && bestUuid && uuid !== bestUuid) {
        if (state.isChildOf(uuid, bestUuid)) {
          bestIndex = i
          bestUuid = uuid
          bestArea = rect.width * rect.height
        }
        continue
      }

      // Same block (or no UUID): pick the smallest rect.
      const area = rect.width * rect.height
      if (area < bestArea) {
        bestIndex = i
        bestUuid = uuid ?? null
        bestArea = area
      }
    }
  }

  setHoveredGroup(bestIndex)
})

onBlokkliEvent('window:clickAway', () => {
  hoveredGroupIndex.value = null
})
</script>

<script lang="ts">
export default {
  name: 'HighlightsRenderer',
}
</script>

<style lang="postcss">
.bk .bk-highlight-tooltip-item {
  .bk-tooltip {
    @apply absolute bottom-full left-0 mb-5;
  }

  &:not(:hover) .bk-tooltip {
    @apply hidden;
  }
}
</style>
