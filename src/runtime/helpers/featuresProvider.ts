import type { FeatureDefinition, AdapterMethods } from '#blokkli/types'
import type { ValidFeatureKey } from '#blokkli-runtime/features'

export type FeaturesProvider = {
  features: ComputedRef<FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]>
  mount: (feature: FeatureDefinition<AdapterMethods[], ValidFeatureKey>) => void
  unmount: (id: string) => void
}

export default function () {
  const mountedFeatures = ref<
    FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]
  >([])

  const features = computed(() => mountedFeatures.value)

  const unmount = (id: string) => {
    mountedFeatures.value = mountedFeatures.value.filter((v) => v.id !== id)
  }

  const mount = (
    feature: FeatureDefinition<AdapterMethods[], ValidFeatureKey>,
  ) => {
    mountedFeatures.value.push(feature)
  }

  return {
    features,
    mount,
    unmount,
  }
}
