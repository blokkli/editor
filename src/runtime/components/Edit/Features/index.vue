<template>
  <Component
    :is="feature.component"
    v-for="feature in availableFeatures"
    :key="feature.id"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, nextTick, computed } from '#imports'
import { featureComponents } from '#blokkli-runtime/features'

const emit = defineEmits(['loaded'])

const { adapter, features, ui, debug } = useBlokkli()

const logger = debug.createLogger('Features')

const renderedFeatures = computed(() =>
  features.features.value.map((v) => v.id),
)

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = adapter.getDisabledFeatures
  ? await adapter.getDisabledFeatures()
  : await Promise.resolve([])

const availableFeatures = computed(() => {
  return featureComponents.filter((v) => {
    // Feature is disabled at runtime.
    if (disabledFeatures.includes(v.id)) {
      return false
    }

    // Feature requires adapter methods that aren't implemented.
    if (
      v.requiredAdapterMethods.length &&
      !v.requiredAdapterMethods.every((method) => adapter[method])
    ) {
      return false
    }

    // Feature has dependencies on other features that are not yet rendered.
    if (
      v.dependencies.length &&
      !v.dependencies.every((id) => renderedFeatures.value.includes(id))
    ) {
      return false
    }

    if (v.beta && !features.enabledBetaFeatures.value.includes(v.id)) {
      return false
    }

    return !v.viewports.length || v.viewports.includes(ui.appViewport.value)
  })
})

onMounted(() => {
  nextTick(() => {
    emit('loaded')
    logger.log('Features loaded', renderedFeatures.value)
  })
})
</script>

<script lang="ts">
export default {
  name: 'Features',
}
</script>
