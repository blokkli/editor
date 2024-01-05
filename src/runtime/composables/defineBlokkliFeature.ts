import type { BlokkliAdapter, AdapterMethods } from '#blokkli/adapter'
import type { FeatureDefinition } from '#blokkli/types'
import type { ValidFeatureKey } from '#blokkli-runtime/features'

type SettingType<S> = S extends { type: 'checkbox' }
  ? boolean
  : S extends { type: 'radios'; options: infer O }
  ? keyof O
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
}

export function defineBlokkliFeature<
  T,
  Methods extends AdapterMethods[],
  F extends FeatureDefinition<Methods, ValidFeatureKey>,
>(feature: F): DefineBlokkliFeature<T, Methods, F> {
  const { adapter, storage, features } = useBlokkli()
  const defaults = Object.entries(feature.settings || {}).reduce<
    Record<string, any>
  >((acc, [key, config]) => {
    acc[key] = config.default
    return acc
  }, {})
  const settingsStorage = storage.use(
    `feature:${feature.id}:settings`,
    defaults,
  )
  const settings = computed(() => {
    return {
      ...defaults,
      ...settingsStorage.value,
    }
  })

  onMounted(() => {
    features.mount(feature)
  })
  onUnmounted(() => {
    features.unmount(feature.id)
  })
  return {
    adapter: adapter as CombinedAdapter<T, Methods>,
    settings: settings as any,
  }
}
