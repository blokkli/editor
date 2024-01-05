<template>
  <Component
    :is="feature.component"
    v-for="feature in availableFeatures"
    :key="feature.id"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, onMounted, nextTick } from '#imports'
import { featureComponents } from '#blokkli-runtime/features'

const emit = defineEmits(['loaded'])

const { adapter, features, ui } = useBlokkli()

const renderedFeatures = computed(() =>
  features.features.value.map((v) => v.id),
)

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = adapter.getDisabledFeatures
  ? await adapter.getDisabledFeatures()
  : await Promise.resolve([])

const availableFeatures = computed(() => {
  return featureComponents.filter((v) => {
    if (disabledFeatures.includes(v.id)) {
      return false
    }
    if (
      v.requiredAdapterMethods.length &&
      !v.requiredAdapterMethods.every((method) => adapter[method])
    ) {
      return false
    }

    if (
      v.dependencies.length &&
      !v.dependencies.every((id) => renderedFeatures.value.includes(id))
    ) {
      return false
    }

    if (
      v.viewports.length &&
      !v.viewports.some((viewport) => ui.appViewport.value === viewport)
    ) {
      return false
    }

    return true
  })
})

onMounted(() => {
  nextTick(() => {
    emit('loaded')
  })
})
</script>

<script lang="ts">
export default {
  name: 'Features',
}
</script>
