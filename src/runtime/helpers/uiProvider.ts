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
import type { AddListOrientation, Rectangle } from '#blokkli/types'
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
  getArtboardScale: () => number
  isMobile: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isArtboard: () => boolean
  isAnimating: Ref<boolean>
  useAnimations: ComputedRef<boolean>
  toolbarHeight: ComputedRef<number>
  visibleViewport: ComputedRef<Rectangle>
  visibleViewportPadded: ComputedRef<Rectangle>
  addListOrientation: ComputedRef<AddListOrientation>

  setViewportBlockingRectangle: (key: string, rect?: Rectangle) => void
  viewportBlockingRects: ComputedRef<Rectangle[]>

  appViewport: ComputedRef<Viewport>

  openContextMenu: Ref<string>

  viewport: ComputedRef<{ width: number; height: number }>
}

export default function (storage: StorageProvider): UiProvider {
  let cachedRootElement: HTMLElement | null = null
  let cachedArtboardElement: HTMLElement | null = null
  let cachedProviderElement: HTMLElement | null = null

  const menuIsOpen = ref(false)
  const isAnimating = ref(false)
  const openContextMenu = ref('')
  const useAnimationsSetting = storage.use('useAnimations', true)
  const useAnimations = computed(() => useAnimationsSetting.value)
  const viewportBlockingRectsMap = ref<Record<string, Rectangle>>({})

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

  const getArtboardScale = () => {
    const el = artboardElement()
    const scaleValue = parseFloat(el.style.scale || '1')
    if (isNaN(scaleValue)) {
      return 1
    }
    return scaleValue
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
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight

    clearTimeout(resizeTimeout)

    resizeTimeout = setTimeout(() => {
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
    if (addListOrientation.value === 'vertical') {
      x += 70
    }
    if (activeSidebarLeft.value) {
      x += 400
    }
    return x
  })
  const visibleViewportY = computed<number>(() => {
    return toolbarHeight.value
  })
  const visibleViewportWidth = computed<number>(() => {
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

  onMounted(async () => {
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
    window.addEventListener('resize', onResize)
    document.documentElement.classList.add('bk-html-root')
    document.body.classList.add('bk-body')
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    document.documentElement.classList.remove('bk-html-root')
    document.body.classList.remove('bk-body')
    clearTimeout(resizeTimeout)
  })

  const viewport = computed(() => {
    return {
      width: viewportWidth.value,
      height: viewportHeight.value,
    }
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
    getArtboardScale,
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
  }
}
