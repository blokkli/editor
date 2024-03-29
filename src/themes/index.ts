import arctic from './arctic.json'
import gruvbox from './gruvbox.json'
import fire from './fire.json'
import nuxt from './nuxt.json'
import type { Theme, ThemeName } from './../runtime/types/theme'

export const themes: Record<ThemeName, Theme> = {
  fire: fire as Theme,
  arctic: arctic as Theme,
  gruvbox: gruvbox as Theme,
  nuxt: nuxt as Theme,
}

export const getTheme = (
  v: Partial<Theme> | ThemeName | undefined | null,
): Partial<Theme> => {
  if (typeof v === 'string') {
    if (v === 'arctic') {
      return themes.arctic
    } else if (v === 'gruvbox') {
      return themes.gruvbox
    } else if (v === 'fire') {
      return themes.fire
    } else if (v === 'nuxt') {
      return themes.nuxt
    }
    throw new Error(`Invalid theme name: ${v}`)
  }

  return v || {}
}
