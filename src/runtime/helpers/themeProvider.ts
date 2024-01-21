import { theme } from '#blokkli/config'
import type {
  DraggableStyle,
  RGB,
  ThemeColorGroup,
  ThemeColorShade,
  ThemeColors,
} from '#blokkli/types'
import { type Ref, ref } from '#imports'
import { getDraggableStyle } from '.'

export type ThemeProvider = {
  accent: Ref<ThemeColors>
  mono: Ref<ThemeColors>
  getDraggableStyle: (el: HTMLElement | SVGElement) => DraggableStyle
  setColor: (group: ThemeColorGroup, shade: ThemeColorShade, value: RGB) => void
}

export default function (): ThemeProvider {
  const accent = ref<ThemeColors>(theme.accent)
  const mono = ref<ThemeColors>(theme.mono)

  return {
    accent,
    mono,
    getDraggableStyle: (el) => getDraggableStyle(el, accent.value[700]),
    setColor: (group, shade, value) => {
      if (group === 'accent') {
        accent.value[shade] = value
      } else if (group === 'mono') {
        mono.value[shade] = value
      }

      const root = document.querySelector(':root')
      if (root instanceof HTMLElement) {
        root.style.setProperty(
          `--bk-theme-${group}-${shade}`,
          `${value[0]} ${value[1]} ${value[2]}`,
        )
      }
    },
  }
}
