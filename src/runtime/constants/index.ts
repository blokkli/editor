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
