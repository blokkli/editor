<template>
  <div class="bk-debug-list">
    <div>
      <div>DPI</div>
      <div>{{ animation.dpi.value }}</div>
    </div>
  </div>
  <div v-for="overlay in debug.overlays.value" :key="overlay.id">
    <FormToggle
      :label="overlay.label"
      :model-value="overlay.active"
      @update:model-value="debug.toggleOverlay(overlay.id)"
    />
  </div>
  <div>
    <FormToggle
      label="Set transforming"
      :model-value="ui.isTransforming.value"
      @update:model-value="toggleTransforming"
    />
  </div>

  <div>
    <FormRadio
      id="rendering-mode"
      label="Rendering Mode"
      :model-value="animation.preferredRenderingMode.value"
      :options="renderingModeOptions"
      @update:model-value="updateRenderingMode"
    />
  </div>
  <div>
    <button
      class="bk-button bk-is-small"
      @click.prevent="() => dom.updateVisibleRects()"
    >
      Refresh Rects
    </button>
  </div>
  <div v-if="animation.hasWebGLContext.value">
    <button
      class="bk-button bk-is-small"
      :disabled="!animation.isRenderingWebGL.value"
      @click.prevent="loseContext"
    >
      Lose WebGL Context
    </button>
  </div>
  <div v-if="animation.hasWebGLContext.value">
    <button
      class="bk-button bk-is-small"
      :disabled="animation.isRenderingWebGL.value"
      @click.prevent="restoreContext"
    >
      Restore WebGL Context
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { FormToggle, FormRadio } from '#blokkli/editor/components'

const { animation, debug, ui, dom } = useBlokkli()

const renderingModeOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'webgl', label: 'WebGL' },
  { value: '2d', label: '2D Canvas' },
]

// WebGL context loss testing - keep a reference to the extension
// because once context is lost, getExtension() returns null
let webglLoseContextExt: WEBGL_lose_context | null = null

function toggleTransforming() {
  if (ui.isTransforming.value) {
    ui.setTransform()
  } else {
    ui.setTransform('Transform plugin label')
  }
}

function updateRenderingMode(value: string | undefined) {
  if (value === 'auto' || value === 'webgl' || value === '2d') {
    animation.preferredRenderingMode.value = value
  }
}

function loseContext() {
  const gl = animation.getRawGL()
  if (gl) {
    // Get and store the extension before losing context
    webglLoseContextExt = gl.getExtension('WEBGL_lose_context')
    if (webglLoseContextExt) {
      webglLoseContextExt.loseContext()
    }
  }
}

function restoreContext() {
  // Use the stored extension reference (can't call getExtension after context is lost)
  if (webglLoseContextExt) {
    webglLoseContextExt.restoreContext()
  }
}
</script>
