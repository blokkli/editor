import {
  type Ref,
  type ComputedRef,
  onMounted,
  onBeforeUnmount,
  ref,
} from 'vue'
import { eventBus } from './eventBus'
import type { BlokkliStorageProvider } from './storageProvider'
import type { AddListOrientation, Rectangle } from '#blokkli/types'

export type BlokkliUiProvider = {
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
}

export default function (storage: BlokkliStorageProvider): BlokkliUiProvider {
  let cachedRootElement: HTMLElement | null = null
  let cachedArtboardElement: HTMLElement | null = null
  let cachedProviderElement: HTMLElement | null = null

  const menuIsOpen = ref(false)
  const isAnimating = ref(false)
  const useAnimationsSetting = storage.use('useAnimations', true)
  const useAnimations = computed(() => useAnimationsSetting.value)

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

  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)
  const isMobile = computed(() => viewportWidth.value < 768)
  const isDesktop = computed(() => viewportWidth.value > 1024)
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

  const previewVisible = storage.use('preview:visible', false)
  const activeSidebar = storage.use('sidebar:active', '')
  const listOrientationSetting = storage.use<AddListOrientation>(
    'listOrientation',
    'vertical',
  )

  const addListOrientation = computed<AddListOrientation>(() =>
    isMobile.value ? 'horizontal' : listOrientationSetting.value,
  )

  const visibleViewportX = computed<number>(() => {
    let x = 0
    if (previewVisible.value && !isMobile.value) {
      x += 400
    }
    if (addListOrientation.value === 'vertical') {
      x += 70
    }
    return x
  })
  const visibleViewportY = computed<number>(() => {
    return toolbarHeight.value
  })
  const visibleViewportWidth = computed<number>(() => {
    let width = viewportWidth.value - visibleViewportX.value
    if (activeSidebar.value) {
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

  const padding = computed(() => 10)

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
      x: visibleViewportX.value + padding.value,
      y: visibleViewportY.value + padding.value,
      width: visibleViewportWidth.value - 2 * padding.value,
      height: visibleViewportHeight.value - 2 * padding.value,
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
  }
}
