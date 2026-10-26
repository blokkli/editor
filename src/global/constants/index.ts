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

/**
 * The color palette when a project defines no `colorOptions`. Its labels are
 * translated.
 */
export const DEFAULT_COLOR_OPTIONS = {
  blue: { hex: '#3b82f6', label: 'Blue' },
  red: { hex: '#ef4444', label: 'Red' },
  green: { hex: '#10b981', label: 'Green' },
  amber: { hex: '#f59e0b', label: 'Amber' },
  purple: { hex: '#8b5cf6', label: 'Purple' },
  pink: { hex: '#ec4899', label: 'Pink' },
  teal: { hex: '#14b8a6', label: 'Teal' },
  orange: { hex: '#f97316', label: 'Orange' },
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
