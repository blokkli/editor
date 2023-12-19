import {
  type Ref,
  type ComputedRef,
  onMounted,
  onBeforeUnmount,
  ref,
} from 'vue'

export type BlokkliUiProvider = {
  rootElement: () => HTMLElement
  artboardElement: () => HTMLElement
  menu: {
    isOpen: Readonly<Ref<boolean>>
    close: () => void
    open: () => void
  }
  getArtboardScale: () => number
  isMobile: ComputedRef<boolean>
  isDesktop: ComputedRef<boolean>
  isArtboard: () => boolean
  isUsingTouch: ComputedRef<boolean>
}

export default function (): BlokkliUiProvider {
  let cachedRootElement: HTMLElement | null = null
  let cachedArtboardElement: HTMLElement | null = null

  const menuIsOpen = ref(false)

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

  const getArtboardScale = () => {
    const el = artboardElement()
    const scaleValue = parseFloat(el.style.scale || '1')
    if (isNaN(scaleValue)) {
      return 1
    }
    return scaleValue
  }

  const viewportWidth = ref(window.innerWidth)
  const isMobile = computed(() => viewportWidth.value < 768)
  const isDesktop = computed(() => viewportWidth.value > 1024)

  const onResize = () => {
    viewportWidth.value = window.innerWidth
  }

  const isArtboard = () => {
    return document.documentElement.classList.contains('bk-is-artboard')
  }

  onMounted(async () => {
    window.addEventListener('resize', onResize)
    document.documentElement.classList.add('bk-html-root')
    document.body.classList.add('bk-body')
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    document.documentElement.classList.remove('bk-html-root')
    document.body.classList.remove('bk-body')
  })

  return {
    menu: {
      isOpen: menuIsOpen,
      close: () => (menuIsOpen.value = false),
      open: () => (menuIsOpen.value = true),
    },
    artboardElement,
    rootElement,
    getArtboardScale,
    isMobile,
    isDesktop,
    isArtboard,
  }
}
