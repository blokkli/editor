import onBlokkliEvent from './composables/onBlokkliEvent'
import useAnimationFrame from './composables/useAnimationFrame'
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  type ComputedRef,
} from '#imports'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { UiProvider } from './uiProvider'
import { createProgramInfo, type ProgramInfo } from 'twgl.js'

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

export default function (ui: UiProvider): AnimationProvider {
  let mouseX = 0
  let mouseY = 0

  // Keep track of how many frames should be rendered.
  // Assuming 60 fps, this value means after every draw request we will only
  // render a maximum of 2 seconds.
  let iterator = 120

  const webglSupported = ref<boolean | null>(null)

  useAnimationFrame(() => {
    // Make sure we don't loop when it's not needed.
    if (iterator < 1) {
      return
    }

    // Decrement the value.
    iterator--

    // Let the "Artboard" feature alter the position/scale of the root element
    // before triggering the main animation loop event.
    eventBus.emit('animationFrame:before')

    eventBus.emit('animationFrame', {
      mouseX,
      mouseY,
      fieldAreas: [],
    })
  })

  onMounted(() => {
    document.addEventListener('scroll', requestDraw)
    document.body.addEventListener('wheel', requestDraw, { passive: false })
  })

  onBeforeUnmount(() => {
    document.body.removeEventListener('wheel', requestDraw)
    document.removeEventListener('scroll', requestDraw)
  })

  const requestDraw = () => (iterator = 120)

  onBlokkliEvent('select', requestDraw)
  onBlokkliEvent('select:start', requestDraw)
  onBlokkliEvent('select:end', requestDraw)
  onBlokkliEvent('select:toggle', requestDraw)
  onBlokkliEvent('option:update', requestDraw)
  onBlokkliEvent('state:reloaded', requestDraw)

  const dpi = computed(() => {
    // Use a reduced DPI when low performance mode is enabled.
    if (ui.lowPerformanceMode.value) {
      return 0.5
    }
    if (ui.isMobile.value) {
      return window.devicePixelRatio
    }
    return Math.min(window.devicePixelRatio, 2.5)
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

      return gl
    },
    setSharedUniforms,
    dpi,
    registerProgram,
    setMouseCoords,
    webglSupported: computed(() => webglSupported.value),
    getCanvasElement,
  }
}
