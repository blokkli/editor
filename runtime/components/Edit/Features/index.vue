<template>
  <Component
    v-for="feature in availableFeatures"
    :key="feature.id"
    :is="feature.component"
  />
</template>

<script lang="ts" setup>
import { featureComponents } from '#blokkli-runtime/features'

const { adapter } = useBlokkli()

// Let the edit adapter determine which features should be disabled at runtime.
const disabledFeatures = await adapter.getDisabledFeatures()

const availableFeatures = computed(() =>
  featureComponents.filter((v) => !disabledFeatures.includes(v.id)),
)
</script>
