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

const { adapter } = useBlokkli()

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = adapter.getDisabledFeatures
  ? await adapter.getDisabledFeatures()
  : await Promise.resolve([])

const availableFeatures = featureComponents.filter(
  (v) =>
    !disabledFeatures.includes(v.id) &&
    v.requiredAdapterMethods.every((method) => adapter[method]),
)

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
