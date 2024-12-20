export const SETTINGS_GROUP = [
  'appearance',
  'artboard',
  'behavior',
  'advanced',
  'beta',
] as const
export const VIEWPORT = ['mobile', 'desktop'] as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[number]
export type Viewport = (typeof VIEWPORT)[number]
