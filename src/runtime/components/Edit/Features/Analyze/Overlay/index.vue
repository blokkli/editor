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
import { useBlokkli, computed } from '#imports'
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
  gl: WebGLRenderingContext
}>()

const { animation, ui, theme, selection, eventBus, element } = useBlokkli()

const programInfo = animation.registerProgram('analyze', props.gl, [vs, fs])

type AnalyzeRectangle = Rectangle & {
  id: string
  index: number
  status: AnalyzeStatus
}

type AnalyzeNode = {
  id: string
  element: HTMLElement
  title: string
  status: AnalyzeStatus
}

const statusPriority: Record<AnalyzeStatus, number> = {
  violation: 3,
  incomplete: 2,
  pass: 1,
  inapplicable: 0,
}

const nodes = computed<AnalyzeNode[]>(() => {
  const allNodes = props.results
    .filter((v) => v.status === 'incomplete' || v.status === 'violation')
    .flatMap((result) => {
      const nodes = Array.isArray(result.nodes) ? result.nodes : [result.nodes]
      return nodes
        .flatMap((node) => {
          const targets = Array.isArray(node.targets)
            ? node.targets
            : [node.targets]
          // Only include HTML elements that are inside the provider element.
          return targets
            .map((v) => {
              if (typeof v === 'string') {
                return element.query(
                  ui.providerElement,
                  v,
                  'Find analyze node target element.',
                )
              }

              return v
            })
            .filter((v) => v instanceof HTMLElement)
            .filter((v) => ui.providerElement.contains(v))
        })
        .map((element) => {
          return {
            id: result.id,
            element,
            title: result.title,
            status: result.status,
          }
        })
    })

  // Deduplicate nodes by element, keeping the highest priority status. That
  // way we prevent rendering multiple rects for the same element.
  const nodeMap = new Map<HTMLElement, AnalyzeNode>()
  for (const node of allNodes) {
    const existing = nodeMap.get(node.element)
    if (
      !existing ||
      statusPriority[node.status] > statusPriority[existing.status]
    ) {
      nodeMap.set(node.element, node)
    }
  }

  return Array.from(nodeMap.values())
})

class AnalyzeRectangleBufferCollector extends RectangleBufferCollector<AnalyzeRectangle> {
  prevKey = ''
  rectCache = new Map<HTMLElement, Rectangle | null>()

  clearCache() {
    this.rectCache.clear()
  }

  getBufferInfo(force?: boolean): {
    info: BufferInfo | null
    hasChanged: boolean
  } {
    const key = nodes.value
      .map((node, index) => {
        if (!this.rectCache.has(node.element)) {
          this.rectCache.set(
            node.element,
            ui.getAbsoluteElementRect(node.element),
          )
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

        // Map status to type (0 = pass, 1 = incomplete, 2 = inapplicable, 3 = violation)
        const statusType =
          node.status === 'violation'
            ? 3
            : node.status === 'incomplete'
              ? 1
              : node.status === 'inapplicable'
                ? 2
                : 0

        this.addRectangle(
          {
            id,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            status: node.status,
          },
          statusType,
        )
      }

      this.prevKey = key
    }

    // Only update the buffer info if it has changed.
    if (hasChanged) {
      this.bufferInfo = this.createBufferInfo()
    }

    return { info: this.bufferInfo, hasChanged }
  }
}

const collector = new AnalyzeRectangleBufferCollector(props.gl)

// Register WebGL renderer with zIndex 500 (analysis layer - renders on top of everything)
defineRenderer('analyze-overlay', {
  zIndex: 500,
  enabled: () =>
    !selection.isMultiSelecting.value && !selection.isDragging.value,
  render: (ctx) => {
    ctx.gl.useProgram(programInfo.program)

    const { info } = collector.getBufferInfo()

    // Nothing to draw.
    if (!info) {
      return
    }

    setUniforms(programInfo, {
      u_color_violation: toShaderColor(theme.red.value.normal),
      u_color_incomplete: toShaderColor(theme.yellow.value.normal),
      u_color_pass: toShaderColor(theme.lime.value.normal),
    })
    animation.setSharedUniforms(ctx.gl, programInfo)

    setBuffersAndAttributes(ctx.gl, programInfo, info)
    drawBufferInfo(ctx.gl, info, ctx.gl.TRIANGLES)
  },
})

onBlokkliEvent('ui:resized', function () {
  collector.clearCache()
  collector.reset()
})

onBlokkliEvent('state:reloaded', function () {
  collector.clearCache()
  collector.reset()
})

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
      eventBus.emit('analyze:click-node', {
        id: node.id,
        target: node.element,
      })
      return
    }
  }
})
</script>

<script lang="ts">
export default {
  name: 'AnalyzeOverlay',
}
</script>
