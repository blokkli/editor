import type { RGB, Theme, ThemeName } from './../shared/types/theme'
import { getTheme, themes } from './themes'
import { createDefu } from 'defu'
import type { ModuleHelper } from './ModuleHelper'

function hexToRgb(hex: string): RGB {
  // Remove the hash symbol if present
  if (hex.startsWith('#')) {
    hex = hex.slice(1)
  }

  // If it's a three-character hex, convert it to six characters
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  // Convert the hex string to RGB
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  return [r, g, b]
}

const buildThemeData = (themeOption?: ThemeName | Partial<Theme>) => {
  const hasCustomTheme = !!themeOption
  const mergeTheme = createDefu((obj, key, value) => {
    // Don't merge RGB array.
    if (Array.isArray(obj[key])) {
      obj[key] = value
      return true
    }
  })
  const theme: Theme = mergeTheme(getTheme(themeOption), themes.arctic)

  const vars = Object.entries(theme)
    .map(([group, colors]) => {
      return Object.entries(colors).map(([shade, color]) => {
        const rgb = typeof color === 'string' ? hexToRgb(color) : color
        return `--bk-theme-${group}-${shade}: ${rgb[0]} ${rgb[1]} ${rgb[2]}`
      })
    })
    .flat()
    .join(';\n')

  const themeCss = `
  :root {
    ${vars}
  }
  `

  const fullTheme = Object.entries(theme).reduce<Record<string, any>>(
    (acc, [group, colors]) => {
      acc[group] = Object.entries(colors).reduce<Record<string, any>>(
        (colorAcc, [key, color]) => {
          const rgb = typeof color === 'string' ? hexToRgb(color) : color
          colorAcc[key] = rgb
          return colorAcc
        },
        {},
      )
      return acc
    },
    {},
  )

  return { themeCss, fullTheme, hasCustomTheme }
}
export class ThemeData {
  public css: string
  public fullTheme: Record<string, any>
  public hasCustomTheme: boolean

  constructor(helper: ModuleHelper) {
    const data = buildThemeData(helper.options.theme)
    this.css = data.themeCss
    this.fullTheme = data.fullTheme
    this.hasCustomTheme = data.hasCustomTheme
  }
}
