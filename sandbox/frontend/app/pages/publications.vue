<template>
  <FrontendRoute>
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
</script>
