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
import type { CursorKeyword } from './dom'
import type { CanvasDrawEvent, Coord } from '#blokkli/types'
import type { SelectionProvider } from './selectionProvider'
import type { ElementProvider } from './providers/element'

export type RenderContext = CanvasDrawEvent & {
  gl: WebGLRenderingContext
}

export type Renderer = {
  id: string
  zIndex: number
  enabled?: () => boolean
  only?: boolean | (() => boolean)
  cursor?: () => CursorKeyword | undefined | null
  onClick?: (coord: {
    mouse: Coord
    mouseArtboard: Coord
  }) => boolean | undefined
  render: (ctx: RenderContext) => void
}

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

  cursor: ComputedRef<CursorKeyword>

  /**
   * Handle a click event by calling onClick handlers on renderers.
   * Returns true if any renderer claimed the click, false otherwise.
   */
  handleClick: (x: number, y: number) => boolean

  /**
   * Register a WebGL renderer with a specific zIndex.
   * Returns an unregister function.
   */
  registerRenderer: (id: string, config: Omit<Renderer, 'id'>) => () => void

  /**
   * Unregister a WebGL renderer.
   */
  unregisterRenderer: (id: string) => void
}

export default function (
  ui: UiProvider,
  storage: StorageProvider,
  selection: SelectionProvider,
  element: ElementProvider,
): AnimationProvider {
  const webglEnabled = storage.use('webglEnabled', true)

  // Current cursor determined by renderers
  const currentCursor = ref<CursorKeyword>('default')
  const cursor = computed<CursorKeyword>(() => currentCursor.value)

  // Renderer management
  const renderers = new Map<string, Renderer>()

  function registerRenderer(
    id: string,
    config: Omit<Renderer, 'id'>,
  ): () => void {
    renderers.set(id, { id, ...config })
    return () => unregisterRenderer(id)
  }

  function unregisterRenderer(id: string): void {
    renderers.delete(id)
  }

  function handleClick(x: number, y: number): boolean {
    // Get all enabled renderers sorted by zIndex (descending - top to bottom)
    const sortedRenderers = Array.from(renderers.values())
      .filter((renderer) => !renderer.enabled || renderer.enabled())
      .sort((a, b) => b.zIndex - a.zIndex)

    // Convert to artboard coordinates
    const artboardOffset = ui.artboardOffset.value
    const artboardScale = ui.artboardScale.value
    const mouseArtboard: Coord = {
      x: (x - artboardOffset.x) / artboardScale,
      y: (y - artboardOffset.y) / artboardScale,
    }

    // Iterate from highest to lowest zIndex
    for (const renderer of sortedRenderers) {
      if (renderer.onClick) {
        const claimed = renderer.onClick({
          mouse: { x, y },
          mouseArtboard,
        })
        if (claimed === true) {
          return true
        }
      }
    }

    return false
  }

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
  let canvasElement: HTMLCanvasElement | null = null

  function getCanvasElement(): HTMLCanvasElement {
    if (canvasElement) {
      return canvasElement
    }

    const el = element.query(
      document.documentElement,
      '#bk-animation-canvas-webgl',
      'Find animation canvas element.',
    )
    if (!(el instanceof HTMLCanvasElement)) {
      throw new TypeError('Failed to locate WebGL canvas.')
    }

    canvasElement = el

    return el
  }

  function gl(): WebGLRenderingContext | undefined {
    if (!webglEnabled.value) {
      return
    }

    if (webglSupported.value === false) {
      return
    }

    const canvas = getCanvasElement()
    const glContext = canvas.getContext('webgl2', {
      premultipliedAlpha: true,
    })

    if (!glContext) {
      webglSupported.value = false
      return
    }

    webglSupported.value = true

    // Query WebGL limits once
    if (!webglLimitsQueried) {
      const maxViewportDims = glContext.getParameter(
        glContext.MAX_VIEWPORT_DIMS,
      ) as Int32Array
      maxCanvasWidth.value = maxViewportDims[0] || 16384
      maxCanvasHeight.value = maxViewportDims[1] || 16384
      webglLimitsQueried = true
    }

    return glContext
  }

  useAnimationFrame((time) => {
    const selectedUuids: string[] = [...selection.uuids.value]

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

    // Clear the canvas before rendering
    const glContext = gl()
    if (glContext) {
      glContext.enable(glContext.BLEND)
      glContext.blendFunc(glContext.SRC_ALPHA_SATURATE, glContext.ONE)
      glContext.blendEquation(glContext.FUNC_ADD)
      glContext.clearColor(0.0, 0.0, 0.0, 0.0)
      glContext.clear(glContext.COLOR_BUFFER_BIT)
    }

    // Execute WebGL renderers in zIndex order
    const sortedRenderers = Array.from(renderers.values()).sort(
      (a, b) => a.zIndex - b.zIndex,
    )

    // Check if any renderer has "only" set to true
    let onlyRenderer: Renderer | null = null
    for (const renderer of sortedRenderers) {
      if (!renderer.enabled || renderer.enabled()) {
        const onlyValue =
          typeof renderer.only === 'function' ? renderer.only() : renderer.only
        if (onlyValue) {
          onlyRenderer = renderer
          break
        }
      }
    }

    const artboardOffset = ui.artboardOffset.value
    const artboardScale = ui.artboardScale.value
    const artboardSize = ui.artboardSize.value
    const mouseArtboard: Coord = {
      x: (mouseX - artboardOffset.x) / artboardScale,
      y: (mouseY - artboardOffset.y) / artboardScale,
    }

    const ctx: RenderContext = {
      gl: glContext!,
      time,
      mouseX,
      mouseY,
      mouseArtboard,
      artboardOffset,
      artboardScale,
      artboardSize,
      selectedUuids,
    }

    // If an "only" renderer is found, render only that one.
    if (onlyRenderer) {
      const glContext = gl()
      if (glContext) {
        try {
          onlyRenderer.render(ctx)
        } catch {}
      }
    } else {
      for (let i = sortedRenderers.length - 1; i >= 0; i--) {
        const renderer = sortedRenderers[i]!
        if (!renderer.enabled || renderer.enabled()) {
          const glContext = gl()
          if (glContext) {
            try {
              renderer.render(ctx)
            } catch {}
          }
        }
      }
    }

    // Determine cursor from renderers (top to bottom by zIndex)
    let newCursor: CursorKeyword = 'default'
    // Iterate from highest to lowest zIndex
    for (let i = sortedRenderers.length - 1; i >= 0; i--) {
      const renderer = sortedRenderers[i]!
      if (renderer.cursor && (!renderer.enabled || renderer.enabled())) {
        const cursorValue = renderer.cursor()
        if (cursorValue) {
          newCursor = cursorValue
          break
        }
      }
    }
    currentCursor.value = newCursor

    eventBus.emit('canvas:draw', ctx)
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

  return {
    requestDraw,
    gl,
    setSharedUniforms,
    dpi,
    registerProgram,
    setMouseCoords,
    webglSupported: computed(() => webglSupported.value && webglEnabled.value),
    webglEnabled,
    getCanvasElement,
    cursor,
    handleClick,
    registerRenderer,
    unregisterRenderer,
  }
}
