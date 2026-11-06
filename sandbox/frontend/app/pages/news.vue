<template>
  <FrontendRoute v-if="node" v-bind="node">
    <NodeOverview source="news" />
  </FrontendRoute>
</template>

<script lang="ts" setup>
// All news, the newest first, as cards. The node is assigned in Drupal's
// frontend_routing settings.
definePageMeta({
  name: 'news',
  path: '/news',
  languageMapping: { de: '/aktuelles', fr: '/actualites' },
  drupalFrontendRoute: true,
  layout: 'drupal',
})

// The node assigned to the route, with its metatags.
const node = await useEditorialRoute()

await renderPageDependencies()
</script>
