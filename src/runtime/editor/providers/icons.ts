import { type BlokkliIcon, icons as iconsBuild } from '#blokkli-build/icons'
import { type Ref, ref } from '#imports'

export type IconsProvider = {
  icons: Ref<Record<BlokkliIcon, string>>
}

export default function (): IconsProvider {
  const icons = ref<Record<BlokkliIcon, string>>(iconsBuild)

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/icons', (mod) => {
      const newIcons = mod as any as
        | { icons: Record<BlokkliIcon, string> }
        | undefined
      if (newIcons) {
        icons.value = newIcons.icons
      }
    })
  }

  return {
    icons,
  }
}
