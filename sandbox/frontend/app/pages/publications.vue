<template>
  <FrontendRoute v-if="node" v-bind="node">
    <NodeOverview source="publications" />
  </FrontendRoute>
</template>

<script lang="ts" setup>
// The current official publications, by type. The node is assigned in Drupal's
// frontend_routing settings.
definePageMeta({
  name: 'publications',
  path: '/publications',
  languageMapping: { de: '/publikationen', fr: '/publications' },
  drupalFrontendRoute: true,
  layout: 'drupal',
})

// The node assigned to the route, with its metatags.
const node = await useEditorialRoute()

await renderPageDependencies()
</script>
