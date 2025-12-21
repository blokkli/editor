import {
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
  type ComputedRef,
  provide,
} from '#imports'
import type { BlokkliAdapter, AdapterMethods } from '#blokkli/adapter'
import type { FeatureDefinition } from '#blokkli/types'
import type { ValidFeatureKey } from '#blokkli-build/features'
import { settingsOverride } from '#blokkli-build/editor-config'
import type { DebugLogger } from '#blokkli/helpers/providers/debug'
import { INJECT_EDIT_LOGGER } from '#blokkli/helpers/injections'

type SettingType<S> = S extends { type: 'checkbox' }
  ? boolean
  : S extends { type: 'radios'; options: infer O }
    ? keyof O
    : S extends { type: 'slider'; default: infer N }
      ? N
      : never

type SettingsTypes<S> = {
  [P in keyof S]: SettingType<S[P]>
}

type RequireAdapterMethods<
  T extends BlokkliAdapter<any>,
  Methods extends readonly AdapterMethods[],
> = Omit<T, Methods[number]> & Required<Pick<T, Methods[number] & keyof T>>

type DefineBlokkliFeature<F extends FeatureDefinition<any, any>> = {
  adapter: F['requiredAdapterMethods'] extends readonly (keyof BlokkliAdapter<any>)[]
    ? RequireAdapterMethods<BlokkliAdapter<any>, F['requiredAdapterMethods']>
    : BlokkliAdapter<any>
  settings: ComputedRef<SettingsTypes<F['settings']>>
  logger: DebugLogger
}

export function defineBlokkliFeature<
  const F extends FeatureDefinition<AdapterMethods[], ValidFeatureKey>,
>(feature: F): DefineBlokkliFeature<F> {
  const { adapter, storage, features, debug } = useBlokkli()

  const logger = debug.createLogger(feature.label || feature.id)

  const storageKey = computed(() => `feature:${feature.id}:settings`)
  const defaults = Object.entries(feature.settings || {}).reduce<
    Record<string, any>
  >((acc, [key, config]) => {
    const overrideKey =
      `feature:${feature.id}:${key}` as keyof typeof settingsOverride
    const override = settingsOverride[overrideKey]
    if (override && 'default' in override && override.default !== undefined) {
      acc[key] = override.default
    } else if ('default' in config) {
      acc[key] = config.default
    }
    return acc
  }, {})

  const settingsStorage = storage.use(storageKey, defaults)

  // The settings that are enforced via config.
  // A setting is enforced if it has been disabled in the config. In this case
  // we always want to use the default value.
  const settingsEnforced = computed(() =>
    Object.keys(feature.settings || {}).reduce<Record<string, any>>(
      (acc, key) => {
        const overrideKey =
          `feature:${feature.id}:${key}` as keyof typeof settingsOverride
        const override = settingsOverride[overrideKey]
        if (override?.disable) {
          acc[key] = defaults[key]
        }
        return acc
      },
      {},
    ),
  )

  const settings = computed(() => {
    return {
      // Default settings defined by the feature.
      ...defaults,

      // Settings altered by the user.
      ...settingsStorage.value,

      // Settings always enforced via config.
      ...settingsEnforced.value,
    }
  })

  onMounted(() => {
    features.mount(feature)
    logger.log('Feature mounted')
  })
  onUnmounted(() => {
    features.unmount(feature.id)
    logger.log('Feature unmounted')
  })

  provide(INJECT_EDIT_LOGGER, logger)

  return {
    adapter: adapter as any,
    settings: settings as any,
    logger,
  }
}
