import type { FeatureDefinition, AdapterMethods } from '#blokkli/types'
import {
  type ValidFeatureKey,
  featureComponents,
} from '#blokkli-runtime/features'
import { computed, ref, type ComputedRef } from '#imports'
import type { StorageProvider } from './storageProvider'
import { falsy } from '.'

export type FeaturesProvider = {
  features: ComputedRef<FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]>
  betaFeatures: ComputedRef<
    { id: ValidFeatureKey; label: string; description?: string }[]
  >
  enabledBetaFeatures: ComputedRef<ValidFeatureKey[]>
  mount: (feature: FeatureDefinition<AdapterMethods[], ValidFeatureKey>) => void
  unmount: (id: string) => void
}

export default function (storage: StorageProvider): FeaturesProvider {
  const mountedFeatures = ref<
    FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]
  >([])

  const settingsSettings = storage.use(
    'feature:settings:settings',
    {} as Record<string, any>,
  )

  const enabledBetaFeatures = computed(() => {
    return Object.entries(settingsSettings.value)
      .map(([key, value]) => {
        const [a, b] = key.split(':')

        if (a === 'beta' && b && value === true) {
          return b
        }

        return null
      })
      .filter(falsy) as ValidFeatureKey[]
  })

  const features = computed(() => mountedFeatures.value)

  const betaFeatures = computed(() =>
    featureComponents
      .filter((v) => v.beta)
      .map((v) => {
        return {
          id: v.id,
          label: v.label,
          description: v.description,
        }
      }),
  )

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
    betaFeatures,
    enabledBetaFeatures,
    mount,
    unmount,
  }
}
