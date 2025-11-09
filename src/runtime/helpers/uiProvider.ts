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
import { eventBus } from './eventBus'
import type { StorageProvider } from './storageProvider'
import type { Coord, Rectangle, SidebarRegion, Size } from '#blokkli/types'
import type { Viewport } from '#blokkli/constants'
import { falsy } from '.'
import { addElementClasses } from './addElementClasses'
import { defineElementStyle } from './defineElementStyle'
import type { AdapterContext } from '#blokkli/adapter'
import { defaultLanguage, forceDefaultLanguage } from '#blokkli-build/config'
import type { ThemeColorName } from '#blokkli/types/theme'
import type { ElementProvider } from './providers/element'

type ResizeElementKey = 'visible-viewport' | 'artboard'

const CLASS_PROXY_MODE = 'bk-is-proxy-mode'

const localeMap: Record<string, string> = {
  de: 'de-CH',
  fr: 'fr-CH',
  it: 'it-CH',
  en: 'en-GB',
}

export type UiProvider = {
  rootElement: () => HTMLElement
  artboardElement: () => HTMLElement
  providerElement: HTMLElement
  isMobile: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isAnimating: Ref<boolean>
  isAnalyzing: Ref<boolean>
  isProxyMode: Ref<boolean>
  hasDialogOpen: ComputedRef<boolean>
  currentDialog: Readonly<Ref<string | null>>
  openDialog: (id: string) => void
  closeDialog: (id?: string) => void
  hasTooltipOpen: ComputedRef<boolean>
  openTooltip: Ref<string>
  selectionColor: ComputedRef<ThemeColorName | null>
  setSelectionColor: (id: string, color: ThemeColorName) => void
  removeSelectionColor: (id: string) => void

  hasTransformOverlayOpen: Ref<boolean>
  isTransforming: ComputedRef<boolean>
  setTransform: (label?: string | null | undefined) => void
  transformLabel: ComputedRef<string>

  useAnimations: ComputedRef<boolean>
  lowPerformanceMode: ComputedRef<boolean>
  visibleViewport: ComputedRef<Rectangle>
  visibleViewportPadded: ComputedRef<Rectangle>

  setViewportBlockingRectangle: (key: string, rect?: Rectangle) => void
  viewportBlockingRects: ComputedRef<Rectangle[]>

  appViewport: ComputedRef<Viewport>

  openContextMenu: Ref<string>

  viewport: ComputedRef<Size>
  artboardSize: ComputedRef<Size>
  artboardScale: Ref<number>
  artboardOffset: Ref<Coord>

  selectionTopLeft: Ref<Coord>

  interfaceLanguage: ComputedRef<string>
  locale: ComputedRef<string>

  formatDate: (
    date: string | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string

  getAbsoluteElementRect: (
    v: HTMLElement | Rectangle,
    scale?: number,
    offset?: Coord,
  ) => Rectangle

  getViewportRelativeRect: (
    rect: Rectangle,
    scale?: number,
    offset?: Coord,
  ) => Rectangle

  setBannerHeight: (id: string, height: number) => void
  removeBanner: (id: string) => void
  setActiveSidebar: (region: SidebarRegion, id: string) => void
  removeActiveSidebar: (region: SidebarRegion, id: string) => void
  hasSidebarLeft: ComputedRef<boolean>
  hasSidebarRight: ComputedRef<boolean>
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
  const currentDialog = ref<string | null>(null)
  const openTooltip = ref('')
  const hasTransformOverlayOpen = ref(false)
  const isAnimating = ref(false)
  const isAnalyzing = ref(false)
  const transformLabel = ref('')
  const openContextMenu = ref('')
  const banners = ref<Record<string, number>>({})

  function openDialog(id: string) {
    currentDialog.value = id
  }

  function closeDialog(id?: string) {
    if (!id || currentDialog.value === id) {
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
  }
}
