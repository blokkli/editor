export const SETTINGS_GROUP = ['appearance', 'behavior', 'advanced'] as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[number]
