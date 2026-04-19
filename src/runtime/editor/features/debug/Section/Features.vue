<template>
  <div class="bk-debug-features">
    <div v-for="feature in featuresList" :key="feature.id">
      <div>
        <StatusIndicator :status="feature.mounted ? 'success' : 'error'" />
      </div>
      <div>
        <h3>{{ feature.label }}</h3>
        <div>{{ feature.id }}</div>
        <p>{{ feature.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import { StatusIndicator } from '#blokkli/editor/components'

const { features } = useBlokkli()

const featuresList = computed(() => {
  return features.definitions.value.map((v) => {
    const feature = features.mountedFeatures.value.find((f) => f.id === v.id)
    return {
      id: v.id,
      label: v.label,
      description: v.description,
      mounted: !!feature,
    }
  })
})
</script>
