import { defineCodeTemplate } from '../defineTemplate'
import { themes } from './../../themes'
import { version } from './../../../../package.json'

export default defineCodeTemplate(
  'editor-config',
  (ctx) => {
    const settingsOverride = ctx.helper.options.settingsOverride || {}
    const featureFragmentNames = ctx.getFeatureFragmentNames()

    return `
export const hasCustomTheme = ${JSON.stringify(ctx.theme.hasCustomTheme)}

export const themes = ${JSON.stringify(themes, null, 2)}

export const theme = ${JSON.stringify(ctx.theme.fullTheme, null, 2)}

export const settingsOverride = ${JSON.stringify(settingsOverride)}

export const blokkliVersion = ${JSON.stringify(version)}

export const templateEntityType = ${JSON.stringify(ctx.helper.options.templateEntityType ?? null)}

export const storageDefaults  = ${JSON.stringify(
      ctx.helper.options.storageDefaults || {},
    )}
export const defaultLanguage = ${JSON.stringify(
      ctx.helper.options.defaultLanguage || 'en',
    )}
export const forceDefaultLanguage = ${JSON.stringify(
      !!ctx.helper.options.forceDefaultLanguage,
    )}

export const featureFragmentNames = ${JSON.stringify(featureFragmentNames)}
`
  },
  (ctx) => {
    return `
import type { Theme } from '${ctx.helper.relativePaths.TYPES_THEME}'
import type { ModuleOptionsSettings } from '#blokkli-build/module-types'
import type { InterfaceLanguage } from '#blokkli-build/translations'

/**
 * Whether the app uses a custom theme.
 */
export declare const hasCustomTheme: boolean

/**
 * All available themes.
 */
export declare const themes: Record<string, Theme>

/**
 * The default theme.
 */
export declare const theme: Theme

/**
 * Overrides for settings.
 */
export declare const settingsOverride: ModuleOptionsSettings

/**
 * The version of the @blokkli/editor package.
 */
export declare const blokkliVersion: string

/**
 * Default storage settings.
 */
export declare const storageDefaults: Record<string, string | boolean | string[]>

/**
 * The default/fallback language.
 */
export declare const defaultLanguage: InterfaceLanguage

/**
 * The entity type of templates.
 */
export declare const templateEntityType: string | null

/**
 * Whether to always force the default language, even on translation pages.
 */
export declare const forceDefaultLanguage: boolean

/**
 * The fragment names provided by features.
 */
export declare const featureFragmentNames: string[]
`
  },
)
