import {
  type Ref,
  type ComputedRef,
  onMounted,
  onBeforeUnmount,
  ref,
  computed,
  watch,
} from 'vue'
import { eventBus } from './eventBus'
import type { StorageProvider } from './storageProvider'
import type { AddListOrientation, Coord, Rectangle, Size } from '#blokkli/types'
import type { Viewport } from '#blokkli/constants'

export type UiProvider = {
  rootElement: () => HTMLElement
  artboardElement: () => HTMLElement
  providerElement: () => HTMLElement
  menu: {
    isOpen: Readonly<Ref<boolean>>
    close: () => void
    open: () => void
  }
  isMobile: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isArtboard: () => boolean
  isAnimating: Ref<boolean>
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
}

export default function (storage: StorageProvider): UiProvider {
  let cachedRootElement: HTMLElement | null = null
  let cachedArtboardElement: HTMLElement | null = null
  let cachedProviderElement: HTMLElement | null = null

  const menuIsOpen = ref(false)
  const isAnimating = ref(false)
  const openContextMenu = ref('')
  const selectionTopLeft = ref({ x: 0, y: 0 })
  const useAnimationsSetting = storage.use('useAnimations', true)
  const useAnimations = computed(() => useAnimationsSetting.value)
  const baseSettings = storage.use('feature:settings:settings', {} as any)
  const lowPerformanceMode = computed(
    () => baseSettings.value.lowPerformanceMode,
  )
  const viewportBlockingRectsMap = ref<Record<string, Rectangle>>({})
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
      delete viewportBlockingRectsMap.value[key]
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

  const providerElement = () => {
    if (cachedProviderElement) {
      return cachedProviderElement
    }
    const el = document.querySelector('[data-blokkli-provider-active="true"]')
    if (!el || !(el instanceof HTMLElement)) {
      throw new Error('Failed to locate provider element.')
    }
    cachedProviderElement = el
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

  const isArtboard = () => {
    return document.documentElement.classList.contains('bk-is-artboard')
  }

  watch(isAnimating, (is) => {
    is
      ? document.documentElement.classList.add('bk-is-animating')
      : document.documentElement.classList.remove('bk-is-animating')
  })

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
      if (addListOrientation.value === 'vertical') {
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

    return height
  })

  const viewportPadding = computed(() => 10)
  const blockingPaddingX = computed(() => 15)
  const blockingPaddingY = computed(() => 50)

  const viewportBlockingRects = computed<Rectangle[]>(() => {
    return Object.values(viewportBlockingRectsMap.value).map((rect) => {
      return {
        x: rect.x - blockingPaddingX.value,
        y: rect.y - blockingPaddingY.value,
        width: rect.width + blockingPaddingX.value * 2,
        height: rect.height + blockingPaddingY.value * 2,
      }
    })
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
      x: visibleViewportX.value + viewportPadding.value,
      y: visibleViewportY.value + viewportPadding.value,
      width: visibleViewportWidth.value - 2 * viewportPadding.value,
      height: visibleViewportHeight.value - 2 * viewportPadding.value,
    }
  })

  onMounted(() => {
    document.documentElement.classList.add('bk-html-root')
    document.body.classList.add('bk-body')
    document.documentElement.classList.add('bk-is-artboard')
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
    window.addEventListener('resize', onResize)

    const artboard = artboardElement()
    resizeObserver.observe(artboard)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    document.documentElement.classList.remove('bk-html-root')
    document.body.classList.remove('bk-body')
    document.documentElement.classList.remove('bk-is-artboard')
    clearTimeout(resizeTimeout)
    const artboard = artboardElement()
    resizeObserver.unobserve(artboard)
    resizeObserver.disconnect()
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
    const rect =
      'x' in v && 'y' in v && 'width' in v && 'height' in v
        ? v
        : v.getBoundingClientRect()
    const scale = providedScale || artboardScale.value
    const offset = providedOffset || artboardOffset.value
    return {
      x: rect.x / scale - offset.x / scale,
      y: rect.y / scale - offset.y / scale,
      width: rect.width / scale,
      height: rect.height / scale,
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
    isArtboard,
    isAnimating,
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
    artboardScale,
    artboardOffset,
    selectionTopLeft,
    lowPerformanceMode,
    getAbsoluteElementRect,
    getViewportRelativeRect,
  }
}
