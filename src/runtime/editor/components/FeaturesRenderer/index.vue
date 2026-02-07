<template>
  <Component
    :is="featureComponents[feature]"
    v-for="feature in availableFeatures"
    :key="feature"
  />
</template>

<script lang="ts" setup>
import {
  type ValidFeatureKey,
  featureComponents,
} from '#blokkli-build/features'
import { useBlokkli, computed, watch } from '#imports'

const emit = defineEmits(['loaded'])

const { adapter, adapters, features, ui, debug, permissions } = useBlokkli()

const logger = debug.createLogger('Features')

const renderedFeatures = computed(() =>
  features.mountedFeatures.value.map((v) => v.id),
)

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = adapter.getDisabledFeatures
  ? await adapter.getDisabledFeatures()
  : await Promise.resolve([])

const availableFeatures = computed<ValidFeatureKey[]>(() => {
  return features.features.value
    .filter((feature) => {
      // Feature is disabled at runtime.
      if (disabledFeatures.includes(feature.id)) {
        return false
      }

      // Feature requires adapter methods that aren't implemented.
      // Check both base adapter and extensions.
      if (feature.requiredAdapterMethods?.length) {
        const hasAllMethods = feature.requiredAdapterMethods.every((method) => {
          // Check base adapter
          if (adapter[method]) {
            return true
          }
          // Check extensions
          return adapters.extensions.some((ext) => ext.methods[method])
        })
        if (!hasAllMethods) {
          return false
        }
      }

      // Check if feature defines permission requirements.
      if (feature.requiredPermissions?.length) {
        const hasAllPermissions = feature.requiredPermissions.every(
          (permission) => permissions.hasPermission(permission),
        )
        if (!hasAllPermissions) {
          return false
        }
      }

      // Feature has dependencies on other features that are not yet rendered.
      if (
        feature.dependencies?.length &&
        !feature.dependencies.every((id) => renderedFeatures.value.includes(id))
      ) {
        return false
      }

      if (
        feature.beta &&
        !features.enabledBetaFeatures.value.includes(
          feature.id as ValidFeatureKey,
        )
      ) {
        return false
      }

      return (
        !feature.viewports?.length ||
        feature.viewports.includes(ui.appViewport.value)
      )
    })
    .map((v) => {
      return v.id as ValidFeatureKey
    })
})

const hasLoadedFeatures = computed(
  () => renderedFeatures.value.length === availableFeatures.value.length,
)

const unwatchInit = watch(
  hasLoadedFeatures,
  (hasLoaded) => {
    if (hasLoaded) {
      emit('loaded')
      logger.log('Features loaded', renderedFeatures.value)
      unwatchInit()
    }
  },
  {
    immediate: true,
  },
)
</script>

<script lang="ts">
export default {
  name: 'Features',
}
</script>
