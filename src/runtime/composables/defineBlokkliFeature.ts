import type { BlokkliAdapter } from '#blokkli/adapter'

type AdapterMethods = keyof BlokkliAdapter<any>

type BlokkliFeatureDefinition<Methods extends AdapterMethods[]> = {
  requiredAdapterMethods: [...Methods]
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

export function defineBlokkliFeature<T, Methods extends AdapterMethods[]>(
  feature: BlokkliFeatureDefinition<Methods>,
): CombinedAdapter<T, Methods> {
  const { adapter } = useBlokkli() // Assuming useBlokkli is defined elsewhere
  return adapter as CombinedAdapter<T, Methods>
}
