<template>
  <div class="bk-debug-features">
    <div v-for="feature in featuresList" :key="feature.id">
      <div>
        <span
          class="bk-status-indicator"
          :class="feature.mounted ? 'bk-is-success' : 'bk-is-danger'"
        />
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

const { features } = useBlokkli()

const featuresList = computed(() => {
  return features.features.value.map((v) => {
    const feature = features.mountedFeatures.value.find((f) => f.id === v.id)
    return {
      id: v.id,
      label: v.label,
      description: v.description,
      dependencies: v.dependencies?.join(', '),
      mounted: !!feature,
    }
  })
})
</script>
