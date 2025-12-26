import {
  type Ref,
  type ComputedRef,
  onMounted,
  onBeforeUnmount,
  ref,
  computed,
  watch,
  readonly,
} from '#imports'
import type { ShallowRef } from 'vue'
import { eventBus } from '../../helpers/eventBus'
import type { StorageProvider } from './storage'
import type {
  Coord,
  GlobalUiDialog,
  Rectangle,
  SidebarRegion,
  Size,
} from '#blokkli/types'
import type { Viewport } from '../../../shared/constants'
import { falsy } from '../../helpers'
import {
  addElementClasses,
  defineElementStyle,
} from '#blokkli/editor/composables'
import type { AdapterContext } from '#blokkli/adapter'
import {
  defaultLanguage,
  forceDefaultLanguage,
} from '#blokkli-build/editor-config'
import type { ThemeColorName } from './../../../shared/types/theme'
import type { ElementProvider } from './element'

type ResizeElementKey = 'visible-viewport' | 'artboard'

const CLASS_PROXY_MODE = 'bk-is-proxy-mode'

const localeMap: Record<string, string> = {
  de: 'de-CH',
  fr: 'fr-CH',
  it: 'it-CH',
  en: 'en-GB',
}

export type UiProvider = {
  /**
   * Get the Nuxt root element (#nuxt-root).
   *
   * Cached after first access for performance.
   *
   * @returns The root HTML element
   * @throws Error if element cannot be found
   */
  rootElement: () => HTMLElement

  /**
   * Get the artboard element (.bk-main-canvas).
   *
   * The artboard is the scrollable container for the edited content.
   * Cached after first access for performance.
   *
   * @returns The artboard HTML element
   * @throws Error if element cannot be found
   */
  artboardElement: () => HTMLElement

  /**
   * The blökkli provider root element.
   *
   * This is the element that contains the entire editor UI.
   */
  providerElement: HTMLElement

  /**
   * Whether the viewport is mobile (< 1024px width).
   */
  isMobile: ComputedRef<boolean>

  /**
   * Whether the viewport is desktop (>= 1024px width).
   */
  isDesktop: ComputedRef<boolean>

  /**
   * Whether animations are currently running.
   *
   * When true, adds 'bk-is-animating' class to document root.
   * Used to disable certain interactions during animations.
   */
  isAnimating: Ref<boolean>

  /**
   * Whether the analyzer is currently active.
   *
   * When true, adds 'bk-is-analyzing' class to document root.
   */
  isAnalyzing: Ref<boolean>

  /**
   * Whether proxy mode is active.
   *
   * Proxy mode shows a structured view of blocks instead of their components.
   */
  isProxyMode: Ref<boolean>

  /**
   * Whether any dialog is currently open.
   */
  hasDialogOpen: ComputedRef<boolean>

  /**
   * The currently open dialog, or null if none is open.
   */
  currentDialog: Readonly<Ref<GlobalUiDialog | null>>

  /**
   * Require confirmation before closing the current dialog.
   *
   * Sets the confirmClose flag on the current dialog, which will
   * require double clicking the dialog background overlay to close it.
   */
  requireDialogCloseConfirm: () => void

  /**
   * Open a global dialog.
   *
   * Closes any previously open dialog and opens the new one.
   *
   * @param dialog - The dialog configuration to open
   */
  openDialog: (dialog: GlobalUiDialog) => void

  /**
   * Close a dialog.
   *
   * @param id - Optional dialog ID. If provided, only closes if it matches the current dialog.
   */
  closeDialog: (id?: string) => void

  /**
   * Whether any tooltip is currently open.
   */
  hasTooltipOpen: ComputedRef<boolean>

  /**
   * ID of the currently open tooltip, or empty string if none is open.
   */
  openTooltip: Ref<string>

  /**
   * The current selection color.
   *
   * Returns the most recently set color, or null if none is set.
   * Used to colorize the selection UI (selection rect, drop target indicators, etc.).
   */
  selectionColor: ComputedRef<ThemeColorName | null>

  /**
   * Set a selection color.
   *
   * Multiple features can set colors with different IDs.
   * The most recently set color is used.
   *
   * @param id - Unique identifier for this color source
   * @param color - The theme color to use
   */
  setSelectionColor: (id: string, color: ThemeColorName) => void

  /**
   * Remove a selection color by ID.
   *
   * If this was the active color, the previous color will become active.
   *
   * @param id - The color source ID to remove
   */
  removeSelectionColor: (id: string) => void

  /**
   * Whether the transform overlay is open.
   *
   * The transform overlay is shown during drag operations, resizing, etc.
   */
  hasTransformOverlayOpen: Ref<boolean>

  /**
   * Whether a transform operation is active.
   *
   * True when transformLabel is not empty.
   */
  isTransforming: ComputedRef<boolean>

  /**
   * Set the active transform operation.
   *
   * @param label - Label describing the transform (e.g., "Moving 3 blocks"), or null/undefined to clear
   */
  setTransform: (label?: string | null | undefined) => void

  /**
   * The current transform operation label.
   */
  transformLabel: ComputedRef<string>

  /**
   * Whether animations are enabled.
   *
   * Can be disabled in settings for performance or accessibility.
   * Defaults to true.
   */
  useAnimations: ComputedRef<boolean>

  /**
   * Whether low performance mode is enabled.
   *
   * When enabled, reduces visual effects and animations for better performance
   * on slower devices.
   */
  lowPerformanceMode: ComputedRef<boolean>

  /**
   * The visible viewport rectangle.
   *
   * Represents the portion of the window where the editor is visible,
   * excluding any overlays or sidebars.
   */
  visibleViewport: ComputedRef<Rectangle>

  /**
   * The visible viewport rectangle with padding applied.
   *
   * Used for positioning elements that should be inset from the viewport edges.
   */
  visibleViewportPadded: ComputedRef<Rectangle>

  /**
   * Register a rectangle that blocks part of the viewport.
   *
   * Blocking rectangles are used for persistent UI elements (toolbars, sidebars)
   * that should affect element positioning and visibility calculations.
   *
   * @param key - Unique identifier for this blocking rectangle
   * @param rect - The rectangle, or undefined to remove the blocking rectangle
   */
  setViewportBlockingRectangle: (key: string, rect?: Rectangle) => void

  /**
   * All viewport blocking rectangles with padding applied.
   *
   * Each rectangle is expanded by blockingPaddingX and blockingPaddingY
   * to create a buffer zone around blocking UI elements.
   */
  viewportBlockingRects: ComputedRef<Rectangle[]>

  /**
   * The current viewport type.
   *
   * 'mobile' for viewports < 1024px width, 'desktop' otherwise.
   * Used to adjust UI layout and behavior.
   */
  appViewport: ComputedRef<Viewport>

  /**
   * ID of the currently open context menu, or empty string if none is open.
   */
  openContextMenu: Ref<string>

  /**
   * The browser window viewport size.
   *
   * Updated on window resize with 400ms debounce.
   */
  viewport: ComputedRef<Size>

  /**
   * The artboard element size.
   *
   * Tracked via ResizeObserver for accurate, efficient updates.
   */
  artboardSize: ComputedRef<Size>

  /**
   * The artboard zoom/scale factor.
   *
   * 1.0 = 100%, 0.5 = 50%, 2.0 = 200%, etc.
   * Used by artboard zoom feature.
   */
  artboardScale: Ref<number>

  /**
   * The artboard scroll/pan offset in pixels.
   *
   * Represents how far the artboard has been scrolled or panned.
   */
  artboardOffset: Ref<Coord>

  /**
   * Top-left coordinate of the selection rectangle.
   *
   * Updated during drag operations and multi-select.
   */
  selectionTopLeft: Ref<Coord>

  /**
   * The interface language code.
   *
   * Respects forceDefaultLanguage config setting.
   * Falls back to context language otherwise.
   */
  interfaceLanguage: ComputedRef<string>

  /**
   * The full locale string for date/number formatting.
   *
   * Maps language codes to locale strings (e.g., 'de' -> 'de-CH').
   */
  locale: ComputedRef<string>

  /**
   * Format a date using the current locale.
   *
   * @param date - Date object or ISO string
   * @param options - Intl.DateTimeFormat options. Defaults to numeric date + time.
   * @returns Localized date string
   *
   * @example
   * ```ts
   * formatDate(new Date()) // "16.11.2025, 14:30"
   * formatDate(isoString, { dateStyle: 'long' }) // "16. November 2025"
   * ```
   */
  formatDate: (
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string

  /**
   * Get absolute rectangle for an element or rectangle.
   *
   * Converts viewport-relative coordinates to artboard-absolute coordinates
   * by accounting for artboard scale and offset. Ensures minimum size of 24x24.
   *
   * @param v - HTML element or rectangle
   * @param scale - Override artboard scale (uses current scale if not provided)
   * @param offset - Override artboard offset (uses current offset if not provided)
   * @returns Absolute rectangle in artboard coordinates
   */
  getAbsoluteElementRect: (
    v: HTMLElement | Rectangle,
    scale?: number,
    offset?: Coord,
  ) => Rectangle

  /**
   * Convert viewport-relative coordinates to artboard-relative coordinates.
   *
   * @param coords - The coordinates to convert.
   * @param scale - Override artboard scale (uses current scale if not provided)
   * @param offset - Override artboard offset (uses current offset if not provided)
   * @returns Coordinates in artboard coordinate space
   */
  toArtboardCoords: (coords: Coord, scale?: number, offset?: Coord) => Coord

  /**
   * Convert artboard-absolute rectangle to viewport-relative coordinates.
   *
   * Applies artboard scale and offset to convert from artboard space
   * to viewport/screen space.
   *
   * @param rect - Rectangle in artboard coordinates
   * @param scale - Override artboard scale (uses current scale if not provided)
   * @param offset - Override artboard offset (uses current offset if not provided)
   * @returns Rectangle in viewport coordinates
   */
  getViewportRelativeRect: (
    rect: Rectangle,
    scale?: number,
    offset?: Coord,
  ) => Rectangle

  /**
   * Set the height of a banner by ID.
   *
   * Banners are persistent notification bars at the top of the interface.
   * Height is used to adjust viewport calculations.
   *
   * @param id - Unique banner identifier
   * @param height - Banner height in pixels
   */
  setBannerHeight: (id: string, height: number) => void

  /**
   * Remove a banner by ID.
   *
   * Sets the banner height to 0.
   *
   * @param id - The banner identifier to remove
   */
  removeBanner: (id: string) => void

  /**
   * Register an active sidebar.
   *
   * Adds the sidebar ID to the active list for the specified region.
   * When sidebars are active, the interface adjusts layout accordingly.
   *
   * @param region - Which sidebar region ('left' or 'right')
   * @param id - Unique sidebar identifier
   */
  setActiveSidebar: (region: SidebarRegion, id: string) => void

  /**
   * Unregister an active sidebar.
   *
   * Removes the sidebar ID from the active list for the specified region.
   *
   * @param region - Which sidebar region ('left' or 'right')
   * @param id - The sidebar identifier to remove
   */
  removeActiveSidebar: (region: SidebarRegion, id: string) => void

  /**
   * Whether any sidebar is active on the left.
   *
   * When true, adds 'bk-has-sidebar-left' class to document root.
   */
  hasSidebarLeft: ComputedRef<boolean>

  /**
   * Whether any sidebar is active on the right.
   *
   * When true, adds 'bk-has-sidebar-right' class to document root.
   */
  hasSidebarRight: ComputedRef<boolean>

  /**
   * Reference to the main layout element.
   *
   * The container element for the primary editor interface.
   */
  mainLayoutElement: Readonly<ShallowRef<HTMLDivElement | null>>
}

export default function (
  providerElement: HTMLElement,
  storage: StorageProvider,
  context: ComputedRef<AdapterContext>,
  element: ElementProvider,
  mainLayoutElement: Readonly<ShallowRef<HTMLDivElement | null>>,
  visibleViewportElement: Readonly<ShallowRef<HTMLDivElement | null>>,
): UiProvider {
  let cachedRootElement: HTMLElement | null = null
  let cachedArtboardElement: HTMLElement | null = null

  const interfaceLanguage = computed<string>(() => {
    return forceDefaultLanguage ? defaultLanguage : context.value.language
  })

  const locale = computed<string>(() => {
    const lang = interfaceLanguage.value
    return localeMap[lang] || lang
  })

  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)
  const visibleViewportWidth = ref(0)
  const visibleViewportHeight = ref(0)
  const visibleViewportX = ref(0)
  const visibleViewportY = ref(0)

  const isProxyMode = ref(false)
  const currentDialog = ref<GlobalUiDialog | null>(null)
  const openTooltip = ref('')
  const hasTransformOverlayOpen = ref(false)
  const isAnimating = ref(false)
  const isAnalyzing = ref(false)
  const transformLabel = ref('')
  const openContextMenu = ref('')
  const banners = ref<Record<string, number>>({})

  function openDialog(dialog: GlobalUiDialog) {
    currentDialog.value = dialog
  }

  function requireDialogCloseConfirm() {
    if (currentDialog.value) {
      currentDialog.value.confirmClose = true
    }
  }

  function closeDialog(id?: string) {
    if (!id || currentDialog.value?.id === id) {
      currentDialog.value = null
    }
  }

  const hasDialogOpen = computed<boolean>(() => currentDialog.value !== null)

  function setBannerHeight(id: string, height: number) {
    banners.value[id] = height
  }
  function removeBanner(id: string) {
    banners.value[id] = 0
  }

  const selectionTopLeft = ref({ x: 0, y: 0 })
  const baseSettings = storage.use('feature:settings:settings', {} as any)
  const lowPerformanceMode = computed(
    () => baseSettings.value.lowPerformanceMode,
  )
  const useAnimations = computed<boolean>(
    () => baseSettings.value.useAnimations !== false,
  )
  const viewportBlockingRectsMap = ref<Record<string, Rectangle | undefined>>(
    {},
  )
  const isTransforming = computed<boolean>(() => !!transformLabel.value)
  const artboardSize = ref<Size>({
    width: 1,
    height: 1,
  })
  const artboardOffset = ref<Coord>({
    x: 0,
    y: 0,
  })
  const artboardScale = ref(1)

  const resizeElementMap: WeakMap<Element, ResizeElementKey> = new WeakMap()

  let visibleViewportResizeTimeout: number | null = null

  function updateVisibleViewport() {
    if (!visibleViewportElement.value) {
      return
    }

    const rect = visibleViewportElement.value.getBoundingClientRect()
    visibleViewportWidth.value = rect.width
    visibleViewportHeight.value = rect.height
    visibleViewportX.value = rect.x
    visibleViewportY.value = rect.y
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const size = entry.contentBoxSize[0]
      if (!size) {
        return
      }

      const key = resizeElementMap.get(entry.target)

      if (!key) {
        return
      }

      if (key === 'artboard') {
        artboardSize.value.width = size.inlineSize
        artboardSize.value.height = size.blockSize
      } else if (key === 'visible-viewport') {
        visibleViewportWidth.value = size.inlineSize
        visibleViewportHeight.value = size.blockSize
        if (visibleViewportResizeTimeout) {
          window.clearTimeout(visibleViewportResizeTimeout)
        }
        visibleViewportResizeTimeout = window.setTimeout(() => {
          updateVisibleViewport()
        }, 50)
      }
    }
  })

  const setViewportBlockingRectangle = (key: string, rect?: Rectangle) => {
    if (!rect) {
      viewportBlockingRectsMap.value[key] = undefined
      return
    }

    viewportBlockingRectsMap.value[key] = rect
  }

  const artboardElement = () => {
    if (cachedArtboardElement) {
      return cachedArtboardElement
    }
    const el = element.query(
      document.documentElement,
      '.bk-main-canvas',
      'Get main canvas.',
    )
    if (!el || !(el instanceof HTMLElement)) {
      throw new Error('Failed to locate artboard element.')
    }
    cachedArtboardElement = el
    return el
  }

  const rootElement = () => {
    if (cachedRootElement) {
      return cachedRootElement
    }
    const el = element.query(
      document.documentElement,
      '#nuxt-root',
      'Get Nuxt root element.',
    )
    if (!el || !(el instanceof HTMLElement)) {
      throw new Error('Failed to locate root Nuxt element.')
    }
    cachedRootElement = el
    return el
  }

  const appViewport = computed<Viewport>(() => {
    if (viewportWidth.value < 1024) {
      return 'mobile'
    }
    return 'desktop'
  })

  const isMobile = computed(() => appViewport.value === 'mobile')
  const isDesktop = computed(() => appViewport.value === 'desktop')
  let resizeTimeout: any = null

  const onResize = () => {
    clearTimeout(resizeTimeout)

    resizeTimeout = setTimeout(() => {
      viewportWidth.value = window.innerWidth
      viewportHeight.value = window.innerHeight
      eventBus.emit('ui:resized')
    }, 400)
  }

  const activeSidebarsLeft = ref<string[]>([])
  const activeSidebarsRight = ref<string[]>([])

  function setActiveSidebar(region: string, id: string) {
    if (region === 'left') {
      if (activeSidebarsLeft.value.includes(id)) {
        return
      }
      activeSidebarsLeft.value.push(id)
    } else {
      if (activeSidebarsRight.value.includes(id)) {
        return
      }
      activeSidebarsRight.value.push(id)
    }
  }

  function removeActiveSidebar(region: string, id: string) {
    if (region === 'left') {
      activeSidebarsLeft.value = activeSidebarsLeft.value.filter(
        (v) => v !== id,
      )
    } else {
      activeSidebarsRight.value = activeSidebarsRight.value.filter(
        (v) => v !== id,
      )
    }
  }

  const hasSidebarLeft = computed<boolean>(() => {
    return !!activeSidebarsLeft.value.length
  })

  const hasSidebarRight = computed<boolean>(() => {
    return !!activeSidebarsRight.value.length
  })

  const blockingPaddingX = computed(() => 15)
  const blockingPaddingY = computed(() => 50)
  const viewportPadding = computed<number>(() => 10)
  const scrollbarWidth = computed<number>(() => 16)

  const viewportBlockingRects = computed<Rectangle[]>(() => {
    return Object.values(viewportBlockingRectsMap.value)
      .map((rect) => {
        if (!rect) {
          return
        }
        return {
          x: rect.x - blockingPaddingX.value,
          y: rect.y - blockingPaddingY.value,
          width: rect.width + blockingPaddingX.value * 2,
          height: rect.height + blockingPaddingY.value * 2,
        }
      })
      .filter(falsy)
  })

  const visibleViewport = computed<Rectangle>(() => {
    return {
      x: visibleViewportX.value,
      y: visibleViewportY.value,
      width: visibleViewportWidth.value,
      height: visibleViewportHeight.value,
    }
  })

  const visibleViewportPadded = computed<Rectangle>(() => {
    const p = viewportPadding.value
    return {
      x: visibleViewportX.value + p,
      y: visibleViewportY.value + p,
      width: visibleViewportWidth.value - 2 * p,
      height: visibleViewportHeight.value - 2 * p,
    }
  })

  const viewport = computed(() => {
    return {
      width: viewportWidth.value,
      height: viewportHeight.value,
    }
  })

  function getAbsoluteElementRect(
    v: HTMLElement | Rectangle,
    providedScale?: number,
    providedOffset?: Coord,
  ): Rectangle {
    const rect = v instanceof HTMLElement ? v.getBoundingClientRect() : v
    const scale = providedScale || artboardScale.value
    const offset = providedOffset || artboardOffset.value
    return {
      x: rect.x / scale - offset.x / scale,
      y: rect.y / scale - offset.y / scale,
      // Force at least a size of 24.
      width: Math.max(rect.width / scale, 24),
      height: Math.max(rect.height / scale, 24),
    }
  }

  function toArtboardCoords(
    coords: Coord,
    providedScale?: number,
    providedOffset?: Coord,
  ): Coord {
    const scale = providedScale || artboardScale.value
    const offset = providedOffset || artboardOffset.value
    return {
      x: coords.x / scale - offset.x / scale,
      y: coords.y / scale - offset.y / scale,
    }
  }

  function getViewportRelativeRect(rect: Rectangle): Rectangle {
    const scale = artboardScale.value
    const offset = artboardOffset.value
    return {
      x: rect.x * scale + offset.x,
      y: rect.y * scale + offset.y,
      width: rect.width * scale,
      height: rect.height * scale,
    }
  }

  function setTransform(label?: string | null | undefined) {
    transformLabel.value = label || ''
  }

  function formatDate(
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }

    return dateObj.toLocaleString(locale.value, options || defaultOptions)
  }

  addElementClasses(document.documentElement, 'bk-is-animating', isAnimating)

  addElementClasses(
    document.documentElement,
    'bk-has-sidebar-left',
    hasSidebarLeft,
  )
  addElementClasses(
    document.documentElement,
    'bk-has-sidebar-right',
    hasSidebarRight,
  )

  addElementClasses(document.documentElement, ['bk-html-root'])
  addElementClasses(document.body, 'bk-body')
  addElementClasses(document.documentElement, CLASS_PROXY_MODE, isProxyMode)
  addElementClasses(document.documentElement, 'bk-is-analyzing', isAnalyzing)

  function observeElement(element: HTMLElement, key: ResizeElementKey) {
    resizeElementMap.set(element, key)
    resizeObserver.observe(element)
  }

  watch(
    visibleViewportElement,
    (el) => {
      if (el) {
        observeElement(el, 'visible-viewport')
      }
    },
    {
      immediate: true,
    },
  )

  onMounted(() => {
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
    window.addEventListener('resize', onResize)

    const artboard = artboardElement()
    observeElement(artboard, 'artboard')
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    clearTimeout(resizeTimeout)
    resizeObserver.disconnect()
  })

  const hasTooltipOpen = computed<boolean>(() => !!openTooltip.value)

  /**
   * Selection colors.
   */
  const selectionColors = ref<{ id: string; color: ThemeColorName }[]>([])

  function setSelectionColor(id: string, color: ThemeColorName) {
    selectionColors.value = [
      ...selectionColors.value.filter((v) => v.id !== id),
      { id, color },
    ]
  }

  function removeSelectionColor(id: string) {
    selectionColors.value = selectionColors.value.filter((v) => v.id !== id)
  }

  const selectionColor = computed<ThemeColorName | null>(() => {
    return (
      selectionColors.value[selectionColors.value.length - 1]?.color ?? null
    )
  })

  defineElementStyle('--bk-viewport-padding', viewportPadding)
  defineElementStyle('--bk-scrollbar-width', scrollbarWidth)

  return {
    artboardElement,
    rootElement,
    providerElement,
    isMobile,
    isDesktop,
    isAnimating,
    isAnalyzing,
    isTransforming,
    setTransform,
    transformLabel: computed(() => transformLabel.value),
    useAnimations,
    visibleViewport,
    visibleViewportPadded,
    setViewportBlockingRectangle,
    viewportBlockingRects,
    appViewport,
    openContextMenu,
    viewport,
    artboardSize: computed(() => artboardSize.value),
    isProxyMode,
    artboardScale,
    artboardOffset,
    selectionTopLeft,
    lowPerformanceMode,
    getAbsoluteElementRect,
    getViewportRelativeRect,
    interfaceLanguage,
    locale,
    formatDate,
    hasDialogOpen,
    hasTransformOverlayOpen,
    hasTooltipOpen,
    openTooltip,
    selectionColor,
    setSelectionColor,
    removeSelectionColor,
    setBannerHeight,
    removeBanner,
    setActiveSidebar,
    removeActiveSidebar,
    hasSidebarLeft,
    hasSidebarRight,
    mainLayoutElement,
    openDialog,
    closeDialog,
    currentDialog: readonly(currentDialog),
    requireDialogCloseConfirm,
    toArtboardCoords,
  }
}
