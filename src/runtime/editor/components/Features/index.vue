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

const { adapter, features, ui, debug } = useBlokkli()

const logger = debug.createLogger('Features')

const renderedFeatures = computed(() =>
  features.mountedFeatures.value.map((v) => v.id),
)

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = adapter.getDisabledFeatures
  ? await adapter.getDisabledFeatures()
  : await Promise.resolve([])

const availableFeatures = computed(() => {
  return features.features.value
    .filter((v) => {
      // Feature is disabled at runtime.
      if (disabledFeatures.includes(v.id)) {
        return false
      }

      // Feature requires adapter methods that aren't implemented.
      if (
        v.requiredAdapterMethods?.length &&
        !v.requiredAdapterMethods.every((method) => adapter[method])
      ) {
        return false
      }

      // Feature has dependencies on other features that are not yet rendered.
      if (
        v.dependencies?.length &&
        !v.dependencies.every((id) => renderedFeatures.value.includes(id))
      ) {
        return false
      }

      if (
        v.beta &&
        !features.enabledBetaFeatures.value.includes(v.id as ValidFeatureKey)
      ) {
        return false
      }

      return !v.viewports?.length || v.viewports.includes(ui.appViewport.value)
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
