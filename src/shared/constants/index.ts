export const BK_HIDDEN_GLOBALLY = 'bkHiddenGlobally'
export const BK_VISIBLE_LANGUAGES = 'bkVisibleLanguages'

export const BUNDLE_FROM_LIBRARY = 'from_library'
export const BUNDLE_BLOKKLI_FRAGMENT = 'blokkli_fragment'
export const INTERNAL_BUNDLES = [BUNDLE_FROM_LIBRARY, BUNDLE_BLOKKLI_FRAGMENT]

export const SETTINGS_GROUP = [
  'appearance',
  'artboard',
  'behavior',
  'beta',
  'advanced',
] as const

export const VIEWPORT = ['mobile', 'desktop'] as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[number]
export type Viewport = (typeof VIEWPORT)[number]
