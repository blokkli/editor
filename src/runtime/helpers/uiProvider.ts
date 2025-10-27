import {
  type Ref,
  type ComputedRef,
  onMounted,
  onBeforeUnmount,
  ref,
  computed,
} from 'vue'
import { eventBus } from './eventBus'
import type { StorageProvider } from './storageProvider'
import type { AddListOrientation, Coord, Rectangle, Size } from '#blokkli/types'
import type { Viewport } from '#blokkli/constants'
import { falsy } from '.'
import { addElementClasses } from './addElementClasses'
import type { StateProvider } from './stateProvider'
import type { AdapterContext } from '#blokkli/adapter'
import { defaultLanguage, forceDefaultLanguage } from '#blokkli-build/config'
import type { ThemeColorName } from '#blokkli/types/theme'

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
  menu: {
    isOpen: Readonly<Ref<boolean>>
    close: () => void
    open: () => void
  }
  isMobile: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isAnimating: Ref<boolean>
  isAnalyzing: Ref<boolean>
  isProxyMode: Ref<boolean>
  hasDialogOpen: Ref<boolean>
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
  toolbarHeight: ComputedRef<number>
  visibleViewport: ComputedRef<Rectangle>
  visibleViewportPadded: ComputedRef<Rectangle>
  addListOrientation: ComputedRef<AddListOrientation>

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
}

export default function (
  providerElement: HTMLElement,
  storage: StorageProvider,
  state: StateProvider,
  context: ComputedRef<AdapterContext>,
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

  const isProxyMode = ref(false)
  const menuIsOpen = ref(false)
  const hasDialogOpen = ref(false)
  const openTooltip = ref('')
  const hasTransformOverlayOpen = ref(false)
  const isAnimating = ref(false)
  const isAnalyzing = ref(false)
  const transformLabel = ref('')
  const openContextMenu = ref('')
  const banners = ref<Record<string, number>>({})

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

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) {
      return
    }

    const size = entry.contentBoxSize[0]
    if (!size) {
      return
    }

    artboardSize.value.width = size.inlineSize
    artboardSize.value.height = size.blockSize
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
    const el = document.querySelector('.bk-main-canvas')
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
    const el = document.querySelector('#nuxt-root')
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

  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)
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

  const toolbarHeight = computed(() => {
    if (isMobile.value) {
      return 80
    }

    return 50
  })

  const activeSidebarLeft = storage.use('sidebar:active:left', '')
  const activeSidebarRight = storage.use('sidebar:active:right', '')

  const settingsStorage = storage.use('feature:add-list:settings', {
    orientation: 'vertical' as any,
  })

  const addListOrientation = computed<AddListOrientation>(() =>
    isMobile.value ? 'horizontal' : settingsStorage.value.orientation,
  )

  const visibleViewportX = computed<number>(() => {
    let x = 0
    if (!isMobile.value) {
      if (
        addListOrientation.value === 'vertical' &&
        state.editMode.value === 'editing'
      ) {
        x += 70
      }
      if (activeSidebarLeft.value) {
        x += 400
      }
    }
    return x
  })
  const visibleViewportY = computed<number>(() => {
    return toolbarHeight.value
  })
  const visibleViewportWidth = computed<number>(() => {
    if (isMobile.value) {
      return viewportWidth.value
    }
    let width = viewportWidth.value - visibleViewportX.value - 50
    if (activeSidebarRight.value) {
      // Chosen by fair dice roll.
      width -= 351
    }
    return width
  })
  const visibleViewportHeight = computed<number>(() => {
    let height = viewportHeight.value - visibleViewportY.value

    if (addListOrientation.value === 'horizontal') {
      if (isMobile.value) {
        height -= 50
      } else {
        height -= 70
      }
    }

    const bannerHeights = Object.values(banners.value).filter(Boolean)

    bannerHeights.forEach((bannerHeight) => {
      height -= bannerHeight
    })

    height -= bannerHeights.length * 10

    return height
  })

  const blockingPaddingX = computed(() => 15)
  const blockingPaddingY = computed(() => 50)

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
    return {
      x: visibleViewportX.value + 10,
      y: visibleViewportY.value + 10,
      width: visibleViewportWidth.value - 10 - 16 - 10,
      height: visibleViewportHeight.value - 20,
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
    activeSidebarLeft,
  )
  addElementClasses(
    document.documentElement,
    'bk-has-sidebar-right',
    activeSidebarRight,
  )

  addElementClasses(document.documentElement, ['bk-html-root'])
  addElementClasses(document.body, 'bk-body')
  addElementClasses(document.documentElement, CLASS_PROXY_MODE, isProxyMode)
  addElementClasses(document.documentElement, 'bk-is-analyzing', isAnalyzing)

  onMounted(() => {
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
    window.addEventListener('resize', onResize)

    const artboard = artboardElement()
    resizeObserver.observe(artboard)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    clearTimeout(resizeTimeout)
    const artboard = artboardElement()
    resizeObserver.unobserve(artboard)
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

  return {
    menu: {
      isOpen: menuIsOpen,
      close: () => (menuIsOpen.value = false),
      open: () => (menuIsOpen.value = true),
    },
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
    toolbarHeight,
    addListOrientation,
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
  }
}
