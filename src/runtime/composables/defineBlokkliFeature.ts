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
import type { ValidFeatureKey } from '#blokkli-runtime/features'
import { settingsOverride } from '#blokkli/config'
import type { DebugLogger } from '#blokkli/helpers/debugProvider'
import { INJECT_EDIT_LOGGER } from '#blokkli/helpers/symbols'

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

// This utility type picks only the methods listed in Methods array and makes them non-optional
type PickRequiredMethods<T, Methods extends AdapterMethods[]> = {
  [K in Methods[number]]: NonNullable<BlokkliAdapter<T>[K]>
}

// This type combines required methods with the rest of the adapter, ensuring required ones are non-optional
type CombinedAdapter<T, Methods extends AdapterMethods[]> = PickRequiredMethods<
  T,
  Methods
> &
  BlokkliAdapter<T>

type DefineBlokkliFeature<
  T,
  Methods extends AdapterMethods[],
  F extends FeatureDefinition<Methods, ValidFeatureKey>,
> = {
  adapter: CombinedAdapter<T, Methods>
  settings: ComputedRef<SettingsTypes<F['settings']>>
  logger: DebugLogger
}

export function defineBlokkliFeature<
  T,
  Methods extends AdapterMethods[],
  F extends FeatureDefinition<Methods, ValidFeatureKey>,
>(feature: F): DefineBlokkliFeature<T, Methods, F> {
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
    adapter: adapter as CombinedAdapter<T, Methods>,
    settings: settings as any,
    logger,
  }
}
