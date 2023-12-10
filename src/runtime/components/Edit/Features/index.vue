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
const disabledFeatures = await adapter.getDisabledFeatures()

const availableFeatures = featureComponents.filter(
  (v) => !disabledFeatures.includes(v.id),
)

onMounted(() => {
  nextTick(() => {
    emit('loaded')
  })
})
</script>
