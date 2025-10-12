import onBlokkliEvent from './composables/onBlokkliEvent'
import useAnimationFrame from './composables/useAnimationFrame'
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  type ComputedRef,
  type WritableComputedRef,
} from '#imports'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { UiProvider } from './uiProvider'
import { createProgramInfo, type ProgramInfo } from 'twgl.js'
import type { StorageProvider } from './storageProvider'

export type AnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void

  /**
   * Get the WebGL rendering context.
   */
  gl: () => WebGLRenderingContext | undefined

  setSharedUniforms: (
    gl: WebGLRenderingContext,
    programInfo: ProgramInfo,
  ) => void

  dpi: ComputedRef<number>

  webglSupported: ComputedRef<boolean | null>
  webglEnabled: WritableComputedRef<boolean>

  getCanvasElement: () => HTMLCanvasElement

  /**
   * Register a WebGL program.
   *
   * The programs are cached by the given ID.
   */
  registerProgram: (
    id: string,
    gl: WebGLRenderingContext,
    shaders: string[],
  ) => ProgramInfo

  setMouseCoords: (x: number, y: number) => void
}

export default function (
  ui: UiProvider,
  storage: StorageProvider,
): AnimationProvider {
  const webglEnabled = storage.use('webglEnabled', true)

  let mouseX = 0
  let mouseY = 0

  // Keep track of how many frames should be rendered.
  // Assuming 60 fps, this value means after every draw request we will only
  // render a maximum of 2 seconds.
  let iterator = 120

  const webglSupported = ref<boolean | null>(null)

  // WebGL limits (queried once from gl.MAX_VIEWPORT_DIMS).
  // These are used to calculate a safe DPI that prevents the canvas from
  // exceeding device capabilities. Default to 16384 (conservative) until queried.
  const maxCanvasWidth = ref(16384)
  const maxCanvasHeight = ref(16384)
  let webglLimitsQueried = false

  useAnimationFrame((time) => {
    // Make sure we don't loop when it's not needed.
    if (iterator < 1) {
      return
    }

    // Decrement the value.
    iterator--

    // Let the "Artboard" feature alter the position/scale of the root element
    // before triggering the main animation loop event.
    eventBus.emit('animationFrame:before', { time, mouseX, mouseY })

    eventBus.emit('animationFrame', {
      mouseX,
      mouseY,
      fieldAreas: [],
      time,
    })
    eventBus.emit('animationFrame:after')
  })

  function onWindowMouseMove(e: MouseEvent) {
    mouseX = e.pageX
    mouseY = e.pageY
  }

  onMounted(() => {
    document.body.addEventListener('wheel', requestDraw, { passive: false })
    window.addEventListener('pointermove', onWindowMouseMove, { capture: true })
  })

  onBeforeUnmount(() => {
    document.body.removeEventListener('wheel', requestDraw)
    window.removeEventListener('pointermove', onWindowMouseMove, {
      capture: true,
    })
  })

  const requestDraw = () => (iterator = 120)

  onBlokkliEvent('select', requestDraw)
  onBlokkliEvent('select:start', requestDraw)
  onBlokkliEvent('select:end', requestDraw)
  onBlokkliEvent('select:toggle', requestDraw)
  onBlokkliEvent('option:update', requestDraw)
  onBlokkliEvent('state:reloaded', requestDraw)

  const dpi = computed(() => {
    const viewportWidth = ui.viewport.value.width
    const viewportHeight = ui.viewport.value.height
    const deviceRatio = window.devicePixelRatio

    // Calculate maximum DPI that keeps canvas within WebGL limits.
    // Canvas size = viewport * DPI, so: DPI = max_size / viewport.
    const maxDpiByWidth = maxCanvasWidth.value / viewportWidth
    const maxDpiByHeight = maxCanvasHeight.value / viewportHeight

    // Limit by pixel budget to avoid memory exhaustion.
    // 16 megapixels = ca. 64MB at 4 bytes/pixel (RGBA).
    const MAX_PIXELS = 16_000_000
    const maxDpiByPixels = Math.sqrt(
      MAX_PIXELS / (viewportWidth * viewportHeight),
    )

    const maxDpi = ui.lowPerformanceMode.value ? 0.5 : 2

    // Return the minimum of all possible DPI values.
    // This makes sure that we don't render a canvas that is too large.
    return Math.min(
      deviceRatio,
      maxDpiByWidth,
      maxDpiByHeight,
      maxDpiByPixels,
      maxDpi,
    )
  })

  function setSharedUniforms(
    gl: WebGLRenderingContext,
    programInfo: ProgramInfo,
  ) {
    const resolution = [ui.viewport.value.width, ui.viewport.value.height]
    gl.uniform2fv(
      gl.getUniformLocation(programInfo.program, 'u_resolution'),
      resolution,
    )

    const offset = ui.artboardOffset.value
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_offset_x'),
      offset.x,
    )
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_offset_y'),
      offset.y,
    )
    gl.uniform1f(
      gl.getUniformLocation(programInfo.program, 'u_scale'),
      ui.artboardScale.value,
    )
    gl.uniform1f(gl.getUniformLocation(programInfo.program, 'u_dpi'), dpi.value)
  }

  const registeredPrograms: Record<string, ProgramInfo> = {}
  function registerProgram(
    id: string,
    gl: WebGLRenderingContext,
    shaders: string[],
  ) {
    if (!registeredPrograms[id]) {
      registeredPrograms[id] = createProgramInfo(gl, shaders)
    }

    return registeredPrograms[id]
  }

  function setMouseCoords(x: number, y: number) {
    mouseX = x
    mouseY = y
    iterator = 120
  }

  function getCanvasElement(): HTMLCanvasElement {
    const el = document.querySelector('#bk-animation-canvas-webgl')
    if (!(el instanceof HTMLCanvasElement)) {
      throw new TypeError('Failed to locate WebGL canvas.')
    }

    return el
  }

  return {
    requestDraw,
    gl: function () {
      if (!webglEnabled.value) {
        return
      }

      if (webglSupported.value === false) {
        return
      }

      const canvas = getCanvasElement()
      const gl = canvas.getContext('webgl2', {
        premultipliedAlpha: true,
      })

      if (!gl) {
        webglSupported.value = false
        return
      }

      webglSupported.value = true

      // Query WebGL limits once
      if (!webglLimitsQueried) {
        const maxViewportDims = gl.getParameter(
          gl.MAX_VIEWPORT_DIMS,
        ) as Int32Array
        console.log({ maxViewportDims })
        maxCanvasWidth.value = maxViewportDims[0] || 16384
        maxCanvasHeight.value = maxViewportDims[1] || 16384
        webglLimitsQueried = true
      }

      return gl
    },
    setSharedUniforms,
    dpi,
    registerProgram,
    setMouseCoords,
    webglSupported: computed(() => webglSupported.value && webglEnabled.value),
    webglEnabled,
    getCanvasElement,
  }
}
