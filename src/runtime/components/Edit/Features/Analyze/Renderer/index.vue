<template>
  <div />
</template>

<script lang="ts" setup>
import type {
  AnalyzeResultMapped,
  AnalyzeStatus,
} from '#blokkli/analyzer/types'
import type { Rectangle } from '#blokkli/types'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import defineRenderer from '#blokkli/helpers/composables/defineRenderer'
import { useBlokkli, computed, watch } from '#imports'
import {
  setBuffersAndAttributes,
  drawBufferInfo,
  type BufferInfo,
  setUniforms,
} from 'twgl.js'
import vs from './vertex.glsl?raw'
import fs from './fragment.glsl?raw'
import { RectangleBufferCollector } from '#blokkli/helpers/webgl'
import { toShaderColor } from '#blokkli/helpers'

const props = defineProps<{
  results: AnalyzeResultMapped[]
  isStale: boolean
  isRunning: boolean
  manualAnalyzerIds: Set<string>
}>()

const { animation, ui, theme, selection, element, dom, blocks } = useBlokkli()

const activeId = defineModel<string>({
  default: '',
})

type AnalyzeRectangle = Rectangle & {
  id: string
  index: number
  nodeIndex: number
  status: AnalyzeStatus
  plugin: string
}

type AnalyzeRendererNode = {
  id: string
  element: HTMLElement
  title: string
  index: number
  status: AnalyzeStatus
  plugin: string
}

const statusPriority: Record<AnalyzeStatus, number> = {
  violation: 3,
  incomplete: 2,
  pass: 1,
  inapplicable: 0,
}

const nodes = computed<AnalyzeRendererNode[]>(() => {
  const mappedNodes: AnalyzeRendererNode[] = []

  for (let i = 0; i < props.results.length; i++) {
    const result = props.results[i]
    if (!result) {
      continue
    }

    if (result.status !== 'incomplete' && result.status !== 'violation') {
      continue
    }

    for (let j = 0; j < result.nodes.length; j++) {
      const node = result.nodes[j]
      if (!node) {
        continue
      }

      for (let k = 0; k < node.targets.length; k++) {
        const target = node.targets[k]
        if (!target) {
          continue
        }

        let targetElement: HTMLElement | null = null

        if (typeof target.target === 'string') {
          targetElement = element.query(
            ui.providerElement,
            target.target,
            'Find analyze node target element.',
          )
        } else if (target.target instanceof HTMLElement) {
          targetElement = target.target
        } else {
          const item = blocks.getBlock(target.target.uuid)
          if (item) {
            targetElement = dom.getDragElement(item) ?? null
          }
        }

        if (targetElement) {
          mappedNodes.push({
            id: result.id,
            element: targetElement,
            index: target.globalIndex,
            title: result.title,
            status: result.status,
            plugin: result.plugin,
          })
        }
      }
    }
  }

  // Deduplicate nodes by element, keeping the highest priority status. That
  // way we prevent rendering multiple rects for the same element.
  const nodeMap = new Map<HTMLElement, AnalyzeRendererNode>()
  for (const node of mappedNodes) {
    const existing = nodeMap.get(node.element)
    if (
      !existing ||
      statusPriority[node.status] > statusPriority[existing.status]
    ) {
      nodeMap.set(node.element, node)
    }
  }

  const finalNodes = Array.from(nodeMap.values())

  return finalNodes
})

const activeRectId = computed(() => {
  if (!activeId.value) {
    return -1.0
  }

  for (let i = 0; i < nodes.value.length; i++) {
    const node = nodes.value[i]!
    const id = node.id + '_____' + node.index
    if (activeId.value === id) {
      return i
    }
  }

  return -1.0
})

class AnalyzeRectangleBufferCollector extends RectangleBufferCollector<AnalyzeRectangle> {
  prevKey = ''
  rectCache = new Map<HTMLElement, Rectangle | null>()

  clearCache() {
    this.rectCache.clear()
    this.prevKey = ''
  }

  getBufferInfo(
    gl?: WebGLRenderingContext,
    force?: boolean,
  ): {
    info: BufferInfo | null
    hasChanged: boolean
  } {
    const key = nodes.value
      .map((node, index) => {
        if (!this.rectCache.has(node.element)) {
          const rect = ui.getAbsoluteElementRect(node.element)
          this.rectCache.set(node.element, rect)
        }

        const rect = this.rectCache.get(node.element)
        if (!rect) {
          return `${index}_no_rect`
        }

        return `${index}_${rect.x}_${rect.y}_${rect.width}_${rect.height}_${node.status}`
      })
      .join('_')

    const hasChanged = force || this.prevKey !== key

    if (hasChanged) {
      this.reset()

      for (let i = 0; i < nodes.value.length; i++) {
        const node = nodes.value[i]!
        const id = `analyze_${i}`

        if (this.added.has(id)) {
          continue
        }

        const rect = this.rectCache.get(node.element)
        if (!rect) {
          continue
        }

        this.added.add(id)

        // Map status and analyzer type to statusType:
        // 0 = violation (manual), 1 = violation (continuous)
        // 2 = incomplete (manual), 3 = incomplete (continuous)
        const isManual = props.manualAnalyzerIds.has(node.plugin)
        const statusType =
          node.status === 'violation' ? (isManual ? 0 : 1) : isManual ? 2 : 3

        this.addRectangle(
          {
            id,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            status: node.status,
            plugin: node.plugin,
            nodeIndex: node.index,
          },
          statusType,
        )
      }

      this.prevKey = key
    }

    // Only update the buffer info if it has changed.
    if (hasChanged && gl) {
      this.bufferInfo = this.createBufferInfo(gl)
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

function getOpacity() {
  return props.isRunning ? 0.3 : 1
}

// Register WebGL renderer with zIndex 500 (analysis layer - renders on top of everything)
const { collector } = defineRenderer('analyze-overlay', {
  zIndex: 500,
  collector: () => new AnalyzeRectangleBufferCollector(),
  program: () => ({ shaders: [vs, fs] }),
  enabled: () =>
    !selection.isMultiSelecting.value &&
    !selection.isDragging.value &&
    !selection.isChangingOptions.value,
  render: (_ctx, gl, program) => {
    gl.useProgram(program.program)

    const { info } = collector.getBufferInfo(gl)

    // Nothing to draw.
    if (!info) {
      return
    }

    setUniforms(program, {
      u_color_violation: toShaderColor(theme.red.value.normal),
      u_color_incomplete: toShaderColor(theme.yellow.value.normal),
      u_opacity: getOpacity(),
      u_manual_stale: props.isStale ? 1.0 : 0.0,
      u_active_id: activeRectId.value,
    })
    animation.setSharedUniforms(gl, program)

    setBuffersAndAttributes(gl, program, info)
    drawBufferInfo(gl, info, gl.TRIANGLES)
  },
  renderFallback: (ctx, ctx2d) => {
    // Call getBufferInfo to populate collector.rects (we don't need the WebGL buffer)
    collector.getBufferInfo()

    const rects = Object.values(collector.rects)

    // Nothing to draw.
    if (rects.length === 0) {
      return
    }

    // Helper to convert shader color to CSS rgba string
    const rgbaToCss = (rgb: [number, number, number], alpha: number) => {
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
    }

    const globalOpacity = getOpacity()
    const borderRadius = 8 * ctx.dpi // 8px border radius

    // Draw all analyze rectangles
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!

      // Determine final opacity
      const isManual = props.manualAnalyzerIds.has(rect.plugin)
      const finalOpacity = isManual && props.isStale ? 0.3 : globalOpacity
      const fillAlpha = 0.3 * finalOpacity

      // Determine color based on status
      const baseColor =
        rect.status === 'violation'
          ? theme.red.value.normal
          : theme.yellow.value.normal

      const fillColor = rgbaToCss(baseColor, fillAlpha)

      const x = (rect.x * ctx.artboardScale + ctx.artboardOffset.x) * ctx.dpi
      const y = (rect.y * ctx.artboardScale + ctx.artboardOffset.y) * ctx.dpi
      const width = rect.width * ctx.artboardScale * ctx.dpi
      const height = rect.height * ctx.artboardScale * ctx.dpi

      ctx2d.fillStyle = fillColor
      ctx2d.beginPath()
      ctx2d.roundRect(x, y, width, height, borderRadius)
      ctx2d.fill()
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

watch(
  () => props.results,
  () => {
    collector.clearCache()
    collector.reset()
  },
)

onBlokkliEvent('mouse:up', (e) => {
  const artboardX = (e.x - ui.artboardOffset.value.x) / ui.artboardScale.value
  const artboardY = (e.y - ui.artboardOffset.value.y) / ui.artboardScale.value

  for (let i = 0; i < nodes.value.length; i++) {
    const node = nodes.value[i]!
    const rect = collector.rectCache.get(node.element)
    if (!rect) {
      continue
    }

    if (
      artboardX >= rect.x &&
      artboardX <= rect.x + rect.width &&
      artboardY >= rect.y &&
      artboardY <= rect.y + rect.height
    ) {
      const id = node.id + '_____' + node.index
      if (activeId.value === id) {
        activeId.value = ''
      } else {
        activeId.value = id
      }
      return
    }
  }
})

onBlokkliEvent('window:clickAway', () => {
  activeId.value = ''
})
</script>

<script lang="ts">
export default {
  name: 'AnalyzeOverlay',
}
</script>
