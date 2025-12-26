import { theme, themes } from '#blokkli-build/editor-config'
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
} from './../../../shared/types/theme'
import { type Ref, ref, onMounted, onBeforeUnmount } from '#imports'
import { rgbaToString } from '..'
import { DragStyle } from '../DragStyle'
import onBlokkliEvent from '../composables/onBlokkliEvent'
import type { ElementProvider } from './element'

type ThemeMap = {
  accent: Ref<ThemeColors>
  mono: Ref<ThemeColors>
  teal: Ref<ThemeContextColors>
  yellow: Ref<ThemeContextColors>
  red: Ref<ThemeContextColors>
  lime: Ref<ThemeContextColors>
  orange: Ref<ThemeContextColors>
}

export type ThemeProvider = {
  /**
   * Accent color palette (primary brand color).
   *
   * Available shades: 50-950
   */
  accent: Ref<ThemeColors>

  /**
   * Monochrome color palette (grays).
   *
   * Available shades: 50-950
   */
  mono: Ref<ThemeColors>

  /**
   * Teal context color palette.
   *
   * Available shades: bg, fg, fgHover, bgHover
   */
  teal: Ref<ThemeContextColors>

  /**
   * Yellow context color palette.
   *
   * Available shades: bg, fg, fgHover, bgHover
   */
  yellow: Ref<ThemeContextColors>

  /**
   * Red context color palette.
   *
   * Available shades: bg, fg, fgHover, bgHover
   */
  red: Ref<ThemeContextColors>

  /**
   * Lime context color palette.
   *
   * Available shades: bg, fg, fgHover, bgHover
   */
  lime: Ref<ThemeContextColors>

  /**
   * Orange context color palette.
   *
   * Available shades: bg, fg, fgHover, bgHover
   */
  orange: Ref<ThemeContextColors>

  /**
   * Get the draggable style for an element.
   *
   * Computes and caches the visual style to use when dragging this element.
   * Includes background color, text color, and border radius.
   *
   * @param el - The element to get style for
   * @returns The draggable style configuration
   */
  getDraggableStyle: (el: HTMLElement | SVGElement) => DraggableStyle

  /**
   * Set a theme color value.
   *
   * Updates both the reactive ref and the CSS custom property on :root.
   *
   * @param group - The color group (accent, mono, teal, etc.)
   * @param shade - The shade (50-950 for accent/mono, bg/fg/etc for context colors)
   * @param value - RGB color as [r, g, b] array
   */
  setColor: <Group extends ThemeColorGroup | ThemeContextColorGroup>(
    group: Group,
    shade: Group extends ThemeColorGroup
      ? ThemeColorShade
      : ThemeContextColorShade,
    value: RGB,
  ) => void

  /**
   * Apply a theme by name.
   *
   * Replaces all theme colors with the selected theme.
   * Use 'custom' to restore previously customized colors.
   *
   * @param name - Theme name or 'custom' for customized theme
   */
  applyTheme: (name: ThemeName | 'custom') => void

  /**
   * Invalidate cached style for an element.
   *
   * Forces recalculation of draggable style next time it's requested.
   * Useful when element styling changes dynamically.
   *
   * @param el - The element to invalidate
   */
  invalidateCachedStyle: (el: HTMLElement | SVGElement) => void

  /**
   * Get an RGB color value from the theme.
   *
   * @param color - The color group
   * @param key - The shade key
   * @returns RGB color as [r, g, b] array
   */
  getColor<K extends keyof ThemeMap, T extends ThemeMap[K]['value']>(
    color: K,
    key: keyof T,
  ): RGB

  /**
   * Get a color as an rgba() CSS string.
   *
   * @param color - The color group
   * @param key - The shade key
   * @param alpha - Optional alpha value (0-1, default: 1)
   * @returns CSS rgba() string
   *
   * @example
   * ```ts
   * theme.getColorString('accent', 700, 0.5) // 'rgba(59, 130, 246, 0.5)'
   * ```
   */
  getColorString<K extends keyof ThemeMap, T extends ThemeMap[K]['value']>(
    color: K,
    key: keyof T,
    alpha?: number,
  ): string
}

export default function (element: ElementProvider): ThemeProvider {
  const rootElement = element.query(
    document,
    ':root',
    'Get document root element for setting theme color.',
  )
  if (!rootElement) {
    throw new Error('Failed to query :root - is this even possible?')
  }
  const originalBrowserThemeColor = ref('')
  const THEME_COLOR = 'black'

  const accent = ref<ThemeColors>(theme.accent)
  const mono = ref<ThemeColors>(theme.mono)
  const teal = ref<ThemeContextColors>(theme.teal)
  const yellow = ref<ThemeContextColors>(theme.yellow)
  const red = ref<ThemeContextColors>(theme.red)
  const lime = ref<ThemeContextColors>(theme.lime)
  const orange = ref<ThemeContextColors>(theme.orange)

  const themeMap: ThemeMap = {
    accent,
    mono,
    teal,
    yellow,
    red,
    lime,
    orange,
  }

  function getColor<K extends keyof ThemeMap, T extends ThemeMap[K]['value']>(
    color: K,
    key: keyof T,
  ): RGB {
    return (themeMap[color].value as any)[key] as RGB
  }

  function getColorString<
    K extends keyof ThemeMap,
    T extends ThemeMap[K]['value'],
  >(color: K, key: keyof T, alpha = 1): string {
    const rgb = getColor(color, key)
    return rgbaToString(rgb, alpha)
  }

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

    rootElement.style.setProperty(
      `--bk-theme-${group}-${shade}`,
      `${value[0]} ${value[1]} ${value[2]}`,
    )
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
    const el = element.query(
      document.head,
      '[name="theme-color"]',
      'Theme: theme-color',
    )
    if (el instanceof HTMLMetaElement) {
      originalBrowserThemeColor.value = el.content
      el.content = THEME_COLOR
    } else {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = THEME_COLOR
      document.head.appendChild(meta)
    }
  })

  onBeforeUnmount(() => {
    const el = element.query(
      document.head,
      '[name="theme-color"]',
      'Theme: theme-color',
    )
    if (el instanceof HTMLMetaElement) {
      if (originalBrowserThemeColor.value) {
        el.content = originalBrowserThemeColor.value
      } else {
        el.remove()
      }
    }
  })

  const dragStyle = new DragStyle()

  function invalidateCachedStyle(el: HTMLElement | SVGElement) {
    dragStyle.invalidateStyle(el)
  }

  onBlokkliEvent('state:reloaded', function () {
    dragStyle.reset()
  })

  return {
    accent,
    mono,
    teal,
    yellow,
    red,
    lime,
    orange,
    getDraggableStyle: function (el: HTMLElement | SVGElement) {
      return dragStyle.getStyle(el, theme.accent[700])
    },
    invalidateCachedStyle,
    setColor,
    applyTheme,
    getColor,
    getColorString,
  }
}
