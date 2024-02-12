<template>
  <div class="container grid grid-cols-4 gap-20 my-20 lg:my-40 lg:gap-40">
    <div v-for="feature in features" :key="feature.id">
      <h3 class="font-bold lg:mb-2">
        {{ feature.label }}
      </h3>
      <p>{{ feature.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineBlokkliFragment } from '#imports'
import featuresData from '#build/blokkli/features.json'

defineBlokkliFragment({
  name: 'features_list',
  label: 'Features List',
  description: 'Renders a list of blökkli features',
  editor: {
    previewWidth: 200,
  },
})

const features = computed(() =>
  featuresData.filter((v) => v.id !== 'demo-feature').map((v) => v.definition),
)
</script>
