export const BK_HIDDEN_GLOBALLY = 'bkHiddenGlobally'
export const BK_VISIBLE_LANGUAGES = 'bkVisibleLanguages'

export const SETTINGS_GROUP = [
  'appearance',
  'artboard',
  'behavior',
  'beta',
  'advanced',
] as const

export const VIEWPORT = ['mobile', 'desktop'] as const

export const TRANSLATION_LANGUAGES = ['de', 'fr', 'it', 'gsw_CH'] as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[number]
export type Viewport = (typeof VIEWPORT)[number]
