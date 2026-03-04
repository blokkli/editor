import {
  onBlokkliEvent,
  useAnimationFrame,
  useTransitionedValue,
} from '#blokkli/editor/composables'
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  type ComputedRef,
  type WritableComputedRef,
} from '#imports'
import type { UiProvider } from './ui'
import { createProgramInfo, type ProgramInfo } from 'twgl.js'
import type { StorageProvider } from './storage'
import type { CursorKeyword } from '#blokkli/editor/types'
import type { SelectionProvider } from './selection'
import type { RectangleBufferCollector } from '../helpers/webgl'
import type { DebugProvider } from './debug'
import type { KeyboardProvider } from './keyboard'
import type { BlokkliEventBus, CanvasDrawEvent } from '../events'
import type { Coord } from '../types/geometry'

export type RenderContext = CanvasDrawEvent & {
  changeOptionsTransition: number
}

type PreferredRenderingMode = 'auto' | 'webgl' | '2d'

/**
 * Configure WebGL context settings.
 * Called when context is first created and when it's restored after loss.
 */
function configureWebGLContext(gl: WebGLRenderingContext) {
  gl.enable(gl.BLEND)
  gl.disable(gl.DEPTH_TEST)
  gl.clearColor(0.0, 0.0, 0.0, 0.0)
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE)
  gl.blendEquation(gl.FUNC_ADD)
}

export type Renderer<T = RectangleBufferCollector<any>> = {
  /**
   * Unique identifier for this renderer.
   */
  id: string

  /**
   * Z-index for rendering order.
   *
   * Lower values render first (bottom), higher values render last (top).
   */
  zIndex: number

  /**
   * Whether this renderer is currently enabled.
   *
   * If not provided or returns true, the renderer will execute.
   */
  enabled?: () => boolean

  /**
   * Whether this renderer should be the only one rendered.
   *
   * When true or returns true, all other renderers are skipped.
   * Useful for debugging or exclusive rendering modes.
   */
  only?: boolean | (() => boolean)

  /**
   * Get the cursor style when hovering over this renderer's content.
   *
   * Higher zIndex renderers take precedence.
   * @returns The cursor keyword, or null/undefined to defer to lower renderers
   */
  cursor?: () => CursorKeyword | undefined | null

  /**
   * Handle click events on this renderer's content.
   *
   * Renderers are checked from highest to lowest zIndex.
   * @param coord - Mouse coordinates in screen and artboard space
   * @returns True to claim the click and stop propagation, false/undefined to continue
   */
  onClick?: (coord: {
    mouse: Coord
    mouseArtboard: Coord
  }) => boolean | undefined

  /**
   * Create the buffer collector instance for this renderer.
   *
   * The collector manages data buffers and rendering state.
   */
  collector: () => T

  /**
   * Define the WebGL shader program for this renderer.
   *
   * @returns Object with vertex and fragment shader source code
   */
  program?: () => { shaders: [string, string] }

  /**
   * Render using WebGL.
   *
   * @param ctx - Rendering context with viewport, mouse, artboard data
   * @param gl - WebGL rendering context
   * @param program - Compiled shader program
   */
  render: (
    ctx: RenderContext,
    gl: WebGLRenderingContext,
    program: ProgramInfo,
  ) => void

  /**
   * Fallback rendering using 2D canvas context.
   *
   * Used when WebGL is disabled or unavailable.
   * @param ctx - Rendering context
   * @param ctx2d - 2D canvas rendering context
   */
  renderFallback?: (ctx: RenderContext, ctx2d: CanvasRenderingContext2D) => void
}

export type AnimationProvider = {
  /**
   * Request an animation loop. Should be called when UI state changes.
   */
  requestDraw: () => void

  /**
   * Reset the animation state and force a remount of all renderer components.
   */
  reset: () => void

  /**
   * Get the WebGL rendering context.
   * Returns undefined if context is lost or not available.
   */
  gl: () => WebGLRenderingContext | undefined

  /**
   * Get the raw WebGL context even if it's lost.
   * For debugging purposes only (e.g., context loss testing).
   */
  getRawGL: () => WebGLRenderingContext | null

  /**
   * Set shared uniforms that are common across all renderers.
   *
   * Sets resolution, artboard offset, scale, and DPI uniforms.
   * @param gl - WebGL rendering context
   * @param programInfo - Shader program to set uniforms on
   */
  setSharedUniforms: (
    gl: WebGLRenderingContext,
    programInfo: ProgramInfo,
  ) => void

  /**
   * Device pixel ratio adjusted for canvas size limits.
   *
   * Automatically scales down to prevent exceeding WebGL/2D canvas size limits
   * and memory constraints. Lower in low-performance mode.
   */
  dpi: ComputedRef<number>

  /**
   * Whether WebGL is supported and enabled.
   *
   * Null initially, then true/false after detection.
   */
  webglSupported: ComputedRef<boolean | null>

  /**
   * Whether WebGL rendering is currently enabled.
   *
   * Can be set to force WebGL on/off. Automatically disables if unsupported.
   */
  webglEnabled: WritableComputedRef<boolean>

  /**
   * User's preferred rendering mode.
   *
   * - 'auto': Uses WebGL if supported, falls back to 2D
   * - 'webgl': Forces WebGL rendering
   * - '2d': Forces 2D canvas rendering
   */
  preferredRenderingMode: WritableComputedRef<PreferredRenderingMode>

  /**
   * Reactive property that indicates if we're currently rendering with WebGL.
   * True when WebGL context exists and is not lost.
   */
  isRenderingWebGL: ComputedRef<boolean>

  /**
   * Reactive property that indicates if we have a WebGL context.
   * True even if the context is lost (for debugging purposes).
   */
  hasWebGLContext: ComputedRef<boolean>

  /**
   * Reactive key that increments when WebGL context is restored.
   * Use this as a component key to force remounting renderer components on context loss/restore.
   */
  renderKey: ComputedRef<number>

  /**
   * Reactive key that changes when switching between WebGL and 2D rendering modes.
   * Use this as the canvas element key to force creating a new canvas with the appropriate context.
   */
  canvasKey: ComputedRef<string>

  /**
   * Set the canvas element to use for rendering.
   * This initializes the appropriate context based on webglEnabled.
   */
  setCanvasElement: (canvas: HTMLCanvasElement) => void

  /**
   * Remove the canvas element and clean up contexts.
   */
  removeCanvasElement: () => void

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

  /**
   * Current cursor style determined by active renderers.
   *
   * Automatically updated each frame based on mouse position and renderer priorities.
   * Defaults to 'move' when pressing Space, otherwise determined by highest zIndex renderer.
   */
  cursor: ComputedRef<CursorKeyword>

  /**
   * Get the current mouse coordinates.
   */
  getMouseCoords: () => Coord

  /**
   * Handle a click event by calling onClick handlers on renderers.
   * Returns true if any renderer claimed the click, false otherwise.
   */
  handleClick: (x: number, y: number) => boolean

  /**
   * Register a WebGL renderer with a specific zIndex.
   * Returns an object with the collector instance and an unregister function.
   */
  registerRenderer: <T = RectangleBufferCollector<any>>(
    id: string,
    config: Omit<Renderer<T>, 'id'>,
  ) => { collector: T; unregister: () => void }

  /**
   * Unregister a WebGL renderer.
   */
  unregisterRenderer: (id: string) => void
}

export default function (
  eventBus: BlokkliEventBus,
  ui: UiProvider,
  storage: StorageProvider,
  selection: SelectionProvider,
  debug: DebugProvider,
  keyboard: KeyboardProvider,
): AnimationProvider {
  const logger = debug.createLogger('Animation')
  const preferredRenderingMode = storage.use<PreferredRenderingMode>(
    'preferredRenderingMode',
    'auto',
  )

  // WebGL support detection (null = not yet tested, true/false = tested)
  const webglSupported = ref<boolean | null>(null)

  // Computed property that determines if WebGL should be enabled based on:
  // - 'auto': uses WebGL if supported, falls back to 2D
  // - 'webgl': forces WebGL (may fail if not supported)
  // - '2d': forces 2D canvas rendering
  const webglEnabled = computed({
    get: () => {
      if (preferredRenderingMode.value === '2d') {
        return false
      }
      if (preferredRenderingMode.value === 'webgl') {
        return true
      }
      // 'auto' mode: use WebGL if supported, otherwise 2D
      return webglSupported.value !== false
    },
    set: (value: boolean) => {
      // When directly setting webglEnabled, update preferredRenderingMode
      preferredRenderingMode.value = value ? 'webgl' : '2d'
    },
  })

  // Current cursor determined by renderers
  const currentCursor = ref<CursorKeyword>('default')
  const cursor = computed<CursorKeyword>(() => currentCursor.value)

  // Render key for forcing Renderer component remounts on context loss/restore
  const renderKey = ref(0)

  // Canvas key for forcing canvas element recreation when switching between WebGL and 2D
  const canvasKey = computed(() => (webglEnabled.value ? 'webgl' : '2d'))

  // Reactive computed property that indicates if we're currently rendering with WebGL
  const isRenderingWebGL = computed(
    () => hasGLContext.value && !isContextLost.value,
  )

  // Renderer management
  const renderers = new Map<string, Renderer>()
  const rendererPrograms = new Map<string, ProgramInfo>()
  const rendererCollectors = new Map<string, RectangleBufferCollector<any>>()

  // Failure tracking for renderers
  const rendererFailures = new Map<string, number>() // Tracks consecutive failures
  const rendererCooldowns = new Map<string, number>() // Tracks cooldown end timestamp
  const renderersPermanentlyDisabled = new Set<string>() // Renderers that failed after cooldown

  /**
   * Check if a renderer should be skipped due to failures.
   */
  function shouldSkipRenderer(id: string): boolean {
    // Check if permanently disabled
    if (renderersPermanentlyDisabled.has(id)) {
      return true
    }

    // Check if in cooldown period
    const cooldownEnd = rendererCooldowns.get(id)
    if (cooldownEnd) {
      const now = Date.now()
      if (now < cooldownEnd) {
        // Still in cooldown
        return true
      } else {
        // Cooldown expired, clear it
        rendererCooldowns.delete(id)
      }
    }

    return false
  }

  /**
   * Handle a renderer failure.
   */
  function handleRendererFailure(id: string): void {
    const failures = (rendererFailures.get(id) || 0) + 1
    rendererFailures.set(id, failures)

    // Check if we just came out of cooldown - if so, disable permanently
    if (failures === 6) {
      renderersPermanentlyDisabled.add(id)
      rendererFailures.delete(id)
      rendererCooldowns.delete(id)
      logger.error(
        `Renderer "${id}" has been permanently disabled due to repeated failures.`,
      )
      return
    }

    // If 5 consecutive failures, put in cooldown for 5 seconds
    if (failures === 5) {
      const cooldownEnd = Date.now() + 5000
      rendererCooldowns.set(id, cooldownEnd)
      logger.error(
        `Renderer "${id}" failed 5 times in a row. Skipping for 5 seconds.`,
      )
    }
  }

  /**
   * Handle a successful renderer execution.
   */
  function handleRendererSuccess(id: string): void {
    // Reset failure count on success
    rendererFailures.delete(id)
  }

  /**
   * Execute a single renderer with failure tracking.
   */
  function executeRenderer(
    renderer: Renderer,
    ctx: RenderContext,
    ctx2dContext: CanvasRenderingContext2D | null,
  ): void {
    if (!renderer.enabled || renderer.enabled()) {
      const glContext = gl()

      // Try WebGL rendering first (only if WebGL is enabled)
      if (glContext && webglEnabled.value && !shouldSkipRenderer(renderer.id)) {
        // Get the program for this renderer
        const program = rendererPrograms.get(renderer.id)

        // Only execute if program exists (renderers with programs require them)
        if (program) {
          try {
            renderer.render(ctx, glContext, program)
            handleRendererSuccess(renderer.id)
          } catch (error) {
            handleRendererFailure(renderer.id)
            logger.error(`Renderer "${renderer.id}" failed:`, error)
          }
        }
      }
      // Fallback to 2D canvas rendering
      else if (ctx2dContext && renderer.renderFallback) {
        try {
          renderer.renderFallback(ctx, ctx2dContext)
          handleRendererSuccess(renderer.id)
        } catch (error) {
          handleRendererFailure(renderer.id)
          logger.error(`Renderer "${renderer.id}" (2D fallback) failed:`, error)
        }
      }
    }
  }

  function registerRenderer<T = RectangleBufferCollector<any>>(
    id: string,
    config: Omit<Renderer<T>, 'id'>,
  ): { collector: T; unregister: () => void } {
    logger.log('Registered Renderer: ' + id)
    const renderer = { id, ...config }
    renderers.set(id, renderer as Renderer)

    // Create the collector instance
    const collector = config.collector()

    // Store collector for state management (enable/disable WebGL, context loss, etc.)
    rendererCollectors.set(id, collector as RectangleBufferCollector<any>)

    // If the renderer has a program, register it
    if (renderer.program) {
      const glContext = gl()
      if (glContext) {
        const { shaders } = renderer.program()
        const programInfo = registerProgram(id, glContext, shaders)
        rendererPrograms.set(id, programInfo)
      }
    }

    return {
      collector,
      unregister: () => unregisterRenderer(id),
    }
  }

  function unregisterRenderer(id: string): void {
    renderers.delete(id)
    // Clean up renderer-to-program mapping (but keep the program in registeredPrograms cache)
    rendererPrograms.delete(id)
    // Clean up collector
    rendererCollectors.delete(id)
    // Clean up failure tracking
    rendererFailures.delete(id)
    rendererCooldowns.delete(id)
    renderersPermanentlyDisabled.delete(id)
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

  // WebGL limits (queried once from gl.MAX_VIEWPORT_DIMS).
  // These are used to calculate a safe DPI that prevents the canvas from
  // exceeding device capabilities. Default to 16384 (conservative) until queried.
  const maxCanvasWidth = ref(16384)
  const maxCanvasHeight = ref(16384)
  let webglLimitsQueried = false
  let canvasElement: HTMLCanvasElement | null = null
  let glContext: WebGLRenderingContext | null = null
  let ctx2dContext: CanvasRenderingContext2D | null = null
  const isContextLost = ref(false) // Track if the WebGL context is currently lost (reactive)
  const hasGLContext = ref(false) // Track if we have a WebGL context (reactive)
  let lastCanvasWidth = 0
  let lastCanvasHeight = 0

  function initializeContexts() {
    if (!canvasElement) {
      glContext = null
      ctx2dContext = null
      isContextLost.value = false
      hasGLContext.value = false
      return
    }

    // Remove any existing event listeners before adding new ones
    // This prevents duplicate listeners if the function is called multiple times
    canvasElement.removeEventListener('webglcontextlost', handleContextLost)
    canvasElement.removeEventListener(
      'webglcontextrestored',
      handleContextRestored,
    )

    // Initialize WebGL context if enabled
    if (webglEnabled.value && webglSupported.value !== false) {
      const gl = canvasElement.getContext('webgl2', {
        premultipliedAlpha: true,
      })

      if (gl) {
        glContext = gl
        ctx2dContext = null // Clear 2D context - canvas can only have one context type
        isContextLost.value = false // Fresh context is not lost
        hasGLContext.value = true // We have a WebGL context
        webglSupported.value = true

        // Query WebGL limits once
        if (!webglLimitsQueried) {
          const maxViewportDims = gl.getParameter(
            gl.MAX_VIEWPORT_DIMS,
          ) as Int32Array
          maxCanvasWidth.value = maxViewportDims[0] || 16384
          maxCanvasHeight.value = maxViewportDims[1] || 16384
          webglLimitsQueried = true
        }

        // Configure WebGL context settings
        configureWebGLContext(gl)

        // Add context loss handlers (now guaranteed to be added only once)
        canvasElement.addEventListener(
          'webglcontextlost',
          handleContextLost,
          false,
        )
        canvasElement.addEventListener(
          'webglcontextrestored',
          handleContextRestored,
          false,
        )
      } else {
        webglSupported.value = false
        glContext = null
        hasGLContext.value = false
        // Fall back to 2D context
        ctx2dContext = canvasElement.getContext('2d')
      }
    } else {
      // WebGL disabled or not supported - use 2D context.
      glContext = null
      hasGLContext.value = false
      ctx2dContext = canvasElement.getContext('2d')
    }
  }

  // Watch for WebGL enabled/disabled changes
  watch(webglEnabled, () => {
    // Clear all WebGL programs as they are context-specific and cannot be reused
    // when switching between rendering modes (new canvas = new context).
    const programCount = registeredPrograms.size
    registeredPrograms.clear()
    rendererPrograms.clear()

    // Clear the canvas element to stop all rendering during the transition.
    // The canvasKey change will trigger AnimationCanvas to remount with a new canvas element
    // which will then call setCanvasElement() to resume rendering.
    removeCanvasElement()

    logger.log(
      `Cleared ${programCount} WebGL programs and stopped rendering due to mode change to ${webglEnabled.value ? 'WebGL' : '2D'}`,
    )
  })

  function handleContextLost(event: Event) {
    event.preventDefault()
    logger.error('WebGL context lost')

    // Mark context as lost but keep the reference
    isContextLost.value = true

    // Clear all programs as they are invalidated by context loss
    const programCount = registeredPrograms.size
    registeredPrograms.clear()
    rendererPrograms.clear()
    logger.log(`Cleared ${programCount} invalidated WebGL programs`)
  }

  function handleContextRestored() {
    logger.log('WebGL context restored')

    // Mark context as valid again
    isContextLost.value = false

    // Re-configure the restored WebGL context
    const restoredGL = glContext
    if (restoredGL) {
      configureWebGLContext(restoredGL)
      logger.log('Re-configured WebGL context settings')
    }

    // Increment renderKey to force all Renderer components to remount
    // This will cause them to re-register their programs with the restored context
    renderKey.value++

    logger.log(
      `Incremented renderKey to ${renderKey.value} to force renderer remount`,
    )

    // Request a draw to resume rendering
    requestDraw()
  }

  function reset() {
    isContextLost.value = true
    registeredPrograms.clear()
    rendererPrograms.clear()
    renderKey.value++
    isContextLost.value = false
  }

  function setCanvasElement(canvas: HTMLCanvasElement) {
    canvasElement = canvas
    initializeContexts()
    updateCanvasSize()

    // Increment renderKey to force all Renderer components to remount
    // This happens AFTER the new canvas and context are initialized,
    // so renderers will have a valid context to register their programs with
    renderKey.value++

    logger.log(
      `Canvas element set with ${webglEnabled.value ? 'WebGL' : '2D'} context, renderKey = ${renderKey.value}`,
    )
  }

  function removeCanvasElement() {
    if (canvasElement) {
      canvasElement.removeEventListener('webglcontextlost', handleContextLost)
      canvasElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      )
    }
    canvasElement = null
    glContext = null
    ctx2dContext = null
    isContextLost.value = false
    hasGLContext.value = false
    lastCanvasWidth = 0
    lastCanvasHeight = 0
  }

  function updateCanvasSize() {
    if (!canvasElement) {
      return
    }

    const canvasWidth = ui.viewport.value.width * dpi.value
    const canvasHeight = ui.viewport.value.height * dpi.value

    // Only update if size changed
    if (canvasWidth !== lastCanvasWidth || canvasHeight !== lastCanvasHeight) {
      canvasElement.width = canvasWidth
      canvasElement.height = canvasHeight

      if (glContext) {
        glContext.viewport(0, 0, canvasWidth, canvasHeight)
      }

      lastCanvasWidth = canvasWidth
      lastCanvasHeight = canvasHeight
    }
  }

  function gl(): WebGLRenderingContext | undefined {
    // Return undefined if context is lost, even if we have a reference
    if (isContextLost.value) {
      return undefined
    }
    return glContext || undefined
  }

  function getRawGL(): WebGLRenderingContext | null {
    // Return the raw context reference even if it's lost
    // For debugging purposes only
    return glContext
  }

  const getChangeOptionsTransition = useTransitionedValue(
    () => {
      return ui.isChangingOptions.value ? 0 : 1
    },
    {
      duration: 150,
    },
  )

  useAnimationFrame((time) => {
    // Disable any animations if a nested editor is open, since they are not visible anyway.
    if (ui.hasNestedEditorOpen.value) {
      return
    }

    const selectedUuids: string[] = [...selection.uuids.value]
    const changeOptionsTransition = getChangeOptionsTransition()

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

    // Update canvas size if needed
    updateCanvasSize()

    // Return early if no canvas element
    if (!canvasElement) {
      return
    }

    // Clear the canvas before rendering
    if (glContext) {
      glContext.clearColor(0.0, 0.0, 0.0, 0.0)
      glContext.clear(glContext.COLOR_BUFFER_BIT)
    } else if (ctx2dContext) {
      // Clear 2D canvas for fallback rendering
      ctx2dContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    }

    // Execute WebGL renderers in zIndex order
    const sortedRenderers = Array.from(renderers.values()).sort((a, b) => {
      if (glContext) {
        return a.zIndex - b.zIndex
      }
      return b.zIndex - a.zIndex
    })

    const artboardOffset = ui.artboardOffset.value
    const artboardScale = ui.artboardScale.value
    const artboardSize = ui.artboardSize.value
    const mouseArtboard: Coord = {
      x: (mouseX - artboardOffset.x) / artboardScale,
      y: (mouseY - artboardOffset.y) / artboardScale,
    }

    const ctx: RenderContext = {
      time,
      mouseX,
      mouseY,
      mouseArtboard,
      artboardOffset,
      artboardScale,
      artboardSize,
      selectedUuids,
      dpi: dpi.value,
      changeOptionsTransition,
    }

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

    // If an "only" renderer is found, render only that one.
    if (onlyRenderer) {
      executeRenderer(onlyRenderer, ctx, ctx2dContext)
    } else {
      for (let i = sortedRenderers.length - 1; i >= 0; i--) {
        const renderer = sortedRenderers[i]!
        executeRenderer(renderer, ctx, ctx2dContext)
      }
    }

    // Determine cursor from renderers (top to bottom by zIndex)
    let newCursor: CursorKeyword = 'default'
    if (keyboard.isPressingSpace.value) {
      newCursor = 'move'
    } else {
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

  // During native drag (file drop from OS), pointermove doesn't fire.
  // The DragIndicator feeds coordinates via this event instead.
  onBlokkliEvent('dragging:move', (e) => {
    mouseX = e.x
    mouseY = e.y
    requestDraw()
  })

  const dpi = computed(() => {
    const viewportWidth = ui.viewport.value.width
    const viewportHeight = ui.viewport.value.height

    // 2D canvas rendering has stricter limits
    if (!webglEnabled.value) {
      // iOS Safari limits 2D canvas to 4,096 x 4,096
      const MAX_2D_CANVAS_SIZE = 4096
      const maxDpiByWidth = MAX_2D_CANVAS_SIZE / viewportWidth
      const maxDpiByHeight = MAX_2D_CANVAS_SIZE / viewportHeight

      // Never exceed DPI of 1 for 2D rendering (performance)
      return Math.min(maxDpiByWidth, maxDpiByHeight, 1)
    }

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

  const registeredPrograms = new Map<string, ProgramInfo>()
  function registerProgram(
    id: string,
    gl: WebGLRenderingContext,
    shaders: string[],
  ) {
    if (!registeredPrograms.has(id)) {
      registeredPrograms.set(id, createProgramInfo(gl, shaders))
    }

    return registeredPrograms.get(id)!
  }

  watch(keyboard.isPressingSpace, () => {
    requestDraw()
  })

  watch(keyboard.isPressingControl, () => {
    requestDraw()
  })

  return {
    requestDraw,
    gl,
    getRawGL,
    setSharedUniforms,
    dpi,
    registerProgram,
    webglSupported: computed(() => webglSupported.value && webglEnabled.value),
    webglEnabled,
    preferredRenderingMode,
    isRenderingWebGL,
    hasWebGLContext: computed(() => hasGLContext.value),
    renderKey: computed(() => renderKey.value),
    canvasKey,
    setCanvasElement,
    removeCanvasElement,
    cursor,
    getMouseCoords: () => ({ x: mouseX, y: mouseY }),
    handleClick,
    registerRenderer,
    unregisterRenderer,
    reset,
  }
}
