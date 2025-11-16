import type { FeatureDefinition, AdapterMethods } from '#blokkli/types'
import {
  type ValidFeatureKey,
  featureDefinitions,
} from '#blokkli-build/features'
import { computed, ref, type ComputedRef } from '#imports'
import type { StorageProvider } from './storage'
import { falsy } from '..'

export type FeaturesProvider = {
  features: ComputedRef<FeatureDefinition[]>
  mountedFeatures: ComputedRef<
    FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]
  >
  betaFeatures: ComputedRef<
    { id: ValidFeatureKey; label: string; description?: string }[]
  >
  enabledBetaFeatures: ComputedRef<ValidFeatureKey[]>
  mount: (feature: FeatureDefinition<AdapterMethods[], ValidFeatureKey>) => void
  unmount: (id: string) => void
}

export default function (storage: StorageProvider): FeaturesProvider {
  const definitions = ref<FeatureDefinition[]>(featureDefinitions)
  const mountedFeatures = ref<
    FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]
  >([])

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/features', (mod) => {
      const newDefinitions = mod as any as
        | { featureDefinitions: FeatureDefinition[] }
        | undefined
      definitions.value = newDefinitions?.featureDefinitions || []
    })
  }

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

  const betaFeatures = computed(() =>
    definitions.value
      .map((v) => {
        if (v.beta && v.label) {
          return {
            id: v.id as ValidFeatureKey,
            label: v.label,
            description: v.description,
          }
        }
      })
      .filter(falsy),
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
    features: computed(() => definitions.value),
    mountedFeatures: computed(() => mountedFeatures.value),
    betaFeatures,
    enabledBetaFeatures,
    mount,
    unmount,
  }
}
