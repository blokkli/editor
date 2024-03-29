import { getDraggableStyle } from '.'
import { theme, themes } from '#blokkli/config'
import type { DraggableStyle } from '#blokkli/types'
import type {
  RGB,
  Theme,
  ThemeColorGroup,
  ThemeColorShade,
  ThemeColors,
  ThemeContextColorGroup,
  ThemeContextColorShade,
  ThemeContextColors,
  ThemeName,
} from '#blokkli/types/theme'
import { type Ref, ref, onMounted, onBeforeUnmount } from '#imports'

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
  applyTheme: (name: ThemeName | 'custom') => void
}

export default function (): ThemeProvider {
  const originalBrowserThemeColor = ref('')
  const THEME_COLOR = 'black'

  const accent = ref<ThemeColors>(theme.accent)
  const mono = ref<ThemeColors>(theme.mono)
  const teal = ref<ThemeContextColors>(theme.teal)
  const yellow = ref<ThemeContextColors>(theme.yellow)
  const red = ref<ThemeContextColors>(theme.red)
  const lime = ref<ThemeContextColors>(theme.lime)

  const customTheme = ref<Theme>(theme)

  const setColor: ThemeProvider['setColor'] = (group, shade, value) => {
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
  }

  const setColorsFromTheme = (v: Theme) => {
    Object.entries(v).forEach(([group, colors]) => {
      Object.entries(colors).forEach(([shade, value]) => {
        setColor(group as any, shade as any, value)
      })
    })
  }

  const applyTheme: ThemeProvider['applyTheme'] = (name) => {
    // Create backup of custom theme.
    customTheme.value = JSON.parse(
      JSON.stringify({
        accent: accent.value,
        mono: mono.value,
        teal: teal.value,
        yellow: yellow.value,
        red: red.value,
        lime: lime.value,
      }),
    )

    if (name === 'custom') {
      return setColorsFromTheme(customTheme.value)
    }
    const themeToApply = themes[name]

    if (themeToApply) {
      setColorsFromTheme(themeToApply)
    }
  }

  onMounted(() => {
    const el = document.head.querySelectorAll('[name="theme-color"]')
    if (el instanceof HTMLMetaElement) {
      originalBrowserThemeColor.value = el.content
      el.content = THEME_COLOR
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = THEME_COLOR
      document.getElementsByTagName('head')[0].appendChild(meta)
    }
  })

  onBeforeUnmount(() => {
    const el = document.head.querySelectorAll('[name="theme-color"]')
    if (el instanceof HTMLMetaElement) {
      if (originalBrowserThemeColor.value) {
        el.content = originalBrowserThemeColor.value
      } else {
        el.remove()
      }
    }
  })

  return {
    accent,
    mono,
    teal,
    yellow,
    red,
    lime,
    getDraggableStyle: (el) => getDraggableStyle(el, accent.value[700]),
    setColor,
    applyTheme,
  }
}
