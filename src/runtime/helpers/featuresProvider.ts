import type { FeatureDefinition } from '#blokkli/types'

export type FeaturesProvider = {
  features: ComputedRef<FeatureDefinition<any>[]>
  mount: (feature: FeatureDefinition<any>) => void
  unmount: (id: string) => void
}

export default function () {
  const mountedFeatures = ref<FeatureDefinition<any>[]>([])

  const features = computed(() => mountedFeatures.value)

  const unmount = (id: string) => {
    mountedFeatures.value = mountedFeatures.value.filter((v) => v.id !== id)
  }

  const mount = (feature: FeatureDefinition<any>) => {
    mountedFeatures.value.push(feature)
  }

  return {
    features,
    mount,
    unmount,
  }
}
