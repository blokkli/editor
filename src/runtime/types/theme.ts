// RGBA, e.g. [255, 255, 255] (white)
export type RGB = [number, number, number]

export type ThemeName = 'arctic' | 'gruvbox' | 'fire'

export type ThemeColorGroup =
  /**
   * The accent color for CTA, selections, highlights.
   */
  | 'accent'

  /**
   * The monochrome color (grey) for UI elements.
   */
  | 'mono'

export type ThemeContextColorGroup =
  /**
   * The teal color used for editable fields.
   */
  | 'teal'

  /**
   * The yellow color used for comments, warning messages or status indicators.
   */
  | 'yellow'

  /**
   * The red color used for the AI assistant, errors and status indicators.
   */
  | 'red'

  /**
   * The lime color used for reusable blocks / library and status indicators.
   */
  | 'lime'

export type ThemeColorShade =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950'

export type ThemeContextColorShade = 'light' | 'normal' | 'dark'

export type ThemeColors = Record<ThemeColorShade, RGB>
export type ThemeContextColors = Record<ThemeContextColorShade, RGB>

export type Theme = Record<ThemeColorGroup, ThemeColors> &
  Record<ThemeContextColorGroup, ThemeContextColors>
