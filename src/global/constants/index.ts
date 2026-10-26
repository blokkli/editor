export const BK_HIDDEN_GLOBALLY = 'bkHiddenGlobally'
export const BK_VISIBLE_LANGUAGES = 'bkVisibleLanguages'

/**
 * The texts of blökkli's own global options. They're translated as long as a
 * project keeps them.
 */
export const BUILT_IN_OPTION_TEXTS = {
  [BK_VISIBLE_LANGUAGES]: {
    label: 'Visible languages',
    description: 'Only show on specific languages.',
  },
  [BK_HIDDEN_GLOBALLY]: {
    label: 'Hide globally',
    description: 'Always hides the block.',
  },
}

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
