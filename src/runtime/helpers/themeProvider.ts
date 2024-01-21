import { theme } from '#blokkli/config'
import type {
  DraggableStyle,
  RGB,
  ThemeColorGroup,
  ThemeColorShade,
  ThemeColors,
  ThemeContextColorGroup,
  ThemeContextColorShade,
  ThemeContextColors,
} from '#blokkli/types'
import { type Ref, ref } from '#imports'
import { getDraggableStyle } from '.'

export type ThemeProvider = {
  accent: Ref<ThemeColors>
  mono: Ref<ThemeColors>
  teal: Ref<ThemeContextColors>
  yellow: Ref<ThemeContextColors>
  red: Ref<ThemeContextColors>
  lime: Ref<ThemeContextColors>
  getDraggableStyle: (el: HTMLElement | SVGElement) => DraggableStyle
  setColor: <Group extends ThemeColorGroup | ThemeContextColorGroup>(
    group: Group,
    shade: Group extends ThemeColorGroup
      ? ThemeColorShade
      : ThemeContextColorShade,
    value: RGB,
  ) => void
}

export default function (): ThemeProvider {
  const accent = ref<ThemeColors>(theme.accent)
  const mono = ref<ThemeColors>(theme.mono)
  const teal = ref<ThemeContextColors>(theme.teal)
  const yellow = ref<ThemeContextColors>(theme.yellow)
  const red = ref<ThemeContextColors>(theme.red)
  const lime = ref<ThemeContextColors>(theme.lime)

  return {
    accent,
    mono,
    teal,
    yellow,
    red,
    lime,
    getDraggableStyle: (el) => getDraggableStyle(el, accent.value[700]),
    setColor: (group, shade, value) => {
      if (group === 'accent') {
        accent.value[shade as ThemeColorShade] = value
      } else if (group === 'mono') {
        mono.value[shade as ThemeColorShade] = value
      } else if (group === 'teal') {
        teal.value[shade as ThemeContextColorShade] = value
      } else if (group === 'red') {
        red.value[shade as ThemeContextColorShade] = value
      } else if (group === 'yellow') {
        yellow.value[shade as ThemeContextColorShade] = value
      } else if (group === 'lime') {
        lime.value[shade as ThemeContextColorShade] = value
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
