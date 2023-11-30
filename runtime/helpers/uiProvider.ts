export type PbUiProvider = {
  rootElement: () => HTMLElement
  artboardElement: () => HTMLElement
  menu: {
    isOpen: Readonly<Ref<boolean>>
    close: () => void
    open: () => void
  }
}

export default function (): PbUiProvider {
  let rootElement: HTMLElement | null = null
  let artboardElement: HTMLElement | null = null

  onMounted(async () => {
    document.documentElement.classList.add('pb-html-root')
    document.body.classList.add('pb-body')
  })
  onBeforeUnmount(() => {
    document.documentElement.classList.remove('pb-html-root')
    document.body.classList.remove('pb-body')
  })

  const menuIsOpen = ref(false)

  return {
    menu: {
      isOpen: menuIsOpen,
      close: () => (menuIsOpen.value = false),
      open: () => (menuIsOpen.value = true),
    },
    rootElement: () => {
      if (rootElement) {
        return rootElement
      }
      const el = document.querySelector('#nuxt-root')
      if (!el || !(el instanceof HTMLElement)) {
        throw new Error('Failed to locate root Nuxt element.')
      }
      rootElement = el
      return el
    },
    artboardElement: () => {
      if (artboardElement) {
        return artboardElement
      }
      const el = document.querySelector('.pb-main-canvas')
      if (!el || !(el instanceof HTMLElement)) {
        throw new Error('Failed to locate artboard element.')
      }
      artboardElement = el
      return el
    },
  }
}
