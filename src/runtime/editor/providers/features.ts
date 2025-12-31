import {
  type ValidFeatureKey,
  featureDefinitions,
} from '#blokkli-build/features'
import { computed, ref, type ComputedRef } from '#imports'
import type { StorageProvider } from './storage'
import { falsy } from '../../helpers'
import type { AdapterMethods } from '#blokkli/editor/adapter'
import type { FeatureDefinition } from '../types/features'

export type FeaturesProvider = {
  /**
   * List of all registered feature definitions.
   *
   * Updates automatically via HMR during development.
   */
  features: ComputedRef<FeatureDefinition[]>

  /**
   * List of currently mounted features.
   *
   * Features are mounted when their components are rendered in the editor.
   * This list is used to track which features are active in the current session.
   */
  mountedFeatures: ComputedRef<
    FeatureDefinition<AdapterMethods[], ValidFeatureKey>[]
  >

  /**
   * List of available beta features.
   *
   * Only includes features marked with `beta: true` in their definition.
   * These features can be individually enabled/disabled by users.
   */
  betaFeatures: ComputedRef<
    { id: ValidFeatureKey; label: string; description?: string }[]
  >

  /**
   * List of beta features that are currently enabled.
   *
   * Derived from user settings stored in local storage.
   * Users can toggle beta features on/off in the settings UI.
   */
  enabledBetaFeatures: ComputedRef<ValidFeatureKey[]>

  /**
   * Mount a feature.
   *
   * Called when a feature component is mounted/rendered.
   * Adds the feature to the mountedFeatures list.
   *
   * @param feature - The feature definition to mount
   */
  mount: (feature: FeatureDefinition<AdapterMethods[], ValidFeatureKey>) => void

  /**
   * Unmount a feature.
   *
   * Called when a feature component is unmounted/destroyed.
   * Removes the feature from the mountedFeatures list.
   *
   * @param id - The feature ID to unmount
   */
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
