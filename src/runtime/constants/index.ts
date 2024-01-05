export const SETTINGS_GROUP = ['appearance', 'behavior', 'advanced'] as const
export const VIEWPORT = ['mobile', 'desktop'] as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[number]
export type Viewport = (typeof VIEWPORT)[number]
