export type ModuleOptionsThemeRgba = [number, number, number]

export type ModuleOptionsThemeColor = {
  50: ModuleOptionsThemeRgba | string
  100: ModuleOptionsThemeRgba | string
  200: ModuleOptionsThemeRgba | string
  300: ModuleOptionsThemeRgba | string
  400: ModuleOptionsThemeRgba | string
  500: ModuleOptionsThemeRgba | string
  600: ModuleOptionsThemeRgba | string
  700: ModuleOptionsThemeRgba | string
  800: ModuleOptionsThemeRgba | string
  900: ModuleOptionsThemeRgba | string
  950: ModuleOptionsThemeRgba | string
}

type ThemeColor = 'red' | 'blue' | 'slate' | 'stone'

export type ModuleOptionsTheme = {
  /**
   * The accent color for CTA, selections, highlights.
   */
  accent?: ModuleOptionsThemeColor | ThemeColor

  /**
   * The monochrome color (grey) for UI elements.
   */
  mono?: ModuleOptionsThemeColor | ThemeColor
}

const red: ModuleOptionsThemeColor = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
  950: '#450a0a',
}

const blue: ModuleOptionsThemeColor = {
  50: '#edf7ff',
  100: '#d7ecff',
  200: '#b7dfff',
  300: '#86cdff',
  400: '#4cb0ff',
  500: '#238cff',
  600: '#0c6bff',
  700: '#0550e6',
  800: '#0c43c1',
  900: '#103d98',
  950: '#0f265c',
}

const slate: ModuleOptionsThemeColor = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
}

const stone: ModuleOptionsThemeColor = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
}

export const themes: Record<string, Required<ModuleOptionsTheme>> = {
  default: {
    accent: blue,
    mono: slate,
  },
  red: {
    accent: red,
    mono: stone,
  },
}

export const getThemeColors = (
  v: ModuleOptionsThemeColor | ThemeColor,
): ModuleOptionsThemeColor => {
  if (typeof v === 'string') {
    if (v === 'stone') {
      return stone
    } else if (v === 'red') {
      return red
    } else if (v === 'blue') {
      return blue
    } else if (v === 'slate') {
      return slate
    }
    throw new Error(`Invalid theme color: ${v}`)
  }

  return v
}
