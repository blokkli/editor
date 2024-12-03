<template>
  <Teleport to="body">
    <canvas id="bk-animation-canvas-webgl" ref="canvasGl" />
  </Teleport>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import type { Rectangle } from '#blokkli/types'
import { ref, computed, useBlokkli, onMounted, watch } from '#imports'

const { ui, animation, eventBus } = useBlokkli()

const canvasGl = ref<HTMLCanvasElement | null>(null)

const canvasAttributes = computed(() => {
  return {
    width: ui.viewport.value.width * animation.dpi.value,
    height: ui.viewport.value.height * animation.dpi.value,
    style: {
      width: ui.viewport.value.width + 'px',
      height: ui.viewport.value.height + 'px',
    },
  }
})

let gl: WebGLRenderingContext | null | undefined = null

function initGl() {
  if (!canvasGl.value) {
    return
  }
  gl = animation.gl()

  canvasGl.value.width = canvasAttributes.value.width
  canvasGl.value.height = canvasAttributes.value.height

  if (!gl) {
    return
  }

  gl.enable(gl.BLEND)
  gl.enable(gl.SCISSOR_TEST)
  gl.disable(gl.DEPTH_TEST)

  gl.clearColor(0.0, 0.0, 0.0, 0.0)
  gl.viewport(0, 0, canvasAttributes.value.width, canvasAttributes.value.height)
  // gl.blendFunc(gl[source.value as any], gl[destination.value as any])
  // gl.blendEquation(gl[equtation.value as any])
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE)
  gl.blendEquation(gl.FUNC_ADD)
  setScissor(scissor.value)
}

const scissor = computed(() => {
  const dpi = animation.dpi.value
  return {
    x: ui.visibleViewport.value.x * dpi,
    y:
      canvasAttributes.value.height -
      ui.visibleViewport.value.y * dpi -
      ui.visibleViewport.value.height * dpi,
    width: Math.max(ui.visibleViewport.value.width * dpi, 1),
    height: Math.max(ui.visibleViewport.value.height * dpi, 1),
  }
})

function setScissor(v: Rectangle) {
  if (!gl) {
    return
  }

  gl.scissor(v.x, v.y, v.width, v.height)
}

watch(scissor, setScissor)

let lastCanvasWidth = 0
let lastCanvasHeight = 0

onBlokkliEvent('animationFrame', (e) => {
  if (!canvasGl.value) {
    return
  }
  const canvasWidth = canvasAttributes.value.width
  const canvasHeight = canvasAttributes.value.height

  // Only update width and height if they have changed.
  if (canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight) {
    canvasGl.value.width = canvasWidth
    canvasGl.value.height = canvasHeight
    if (gl) {
      gl.viewport(0, 0, canvasWidth, canvasHeight)
    }
    lastCanvasWidth = canvasWidth
    lastCanvasHeight = canvasHeight
  }
  const offset = ui.artboardOffset.value
  const scale = ui.artboardScale.value
  // const size = ui.artboardSize.value
  // const dpi = animation.dpi.value
  // Restrict drawing to area on and 20px around artboard.
  // gl.scissor(
  //   offset.x * dpi - 20,
  //   canvasHeight - offset.y * dpi - 20 - size.height * dpi * scale,
  //   size.width * scale * dpi + 40,
  //   size.height * scale * dpi + 40,
  // )
  // gl.clearColor(1.0, 0.0, 0.0, 0.4)
  // gl.clear(gl.COLOR_BUFFER_BIT)

  eventBus.emit('canvas:draw', {
    ...e,
    artboardOffset: offset,
    artboardScale: scale,
  })
})

onMounted(() => {
  initGl()
})
</script>
