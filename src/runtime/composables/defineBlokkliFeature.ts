import type { BlokkliAdapter, AdapterMethods } from '#blokkli/adapter'
import type { FeatureDefinition } from '#blokkli/types'

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

type DefineBlokkliFeature<T, Methods extends AdapterMethods[]> = {
  adapter: CombinedAdapter<T, Methods>
}

export function defineBlokkliFeature<T, Methods extends AdapterMethods[]>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  feature: FeatureDefinition<Methods>,
): DefineBlokkliFeature<T, Methods> {
  const { adapter } = useBlokkli()
  return {
    adapter: adapter as CombinedAdapter<T, Methods>,
  }
}
