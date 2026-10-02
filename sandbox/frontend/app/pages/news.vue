<template>
  <FrontendRoute>
    <NodeOverview source="news" />
  </FrontendRoute>
</template>

<script lang="ts" setup>
import { definePageMeta } from '#imports'
import { FrontendRoute, NodeOverview } from '#components'

// All news, the newest first, as cards. The node is assigned in Drupal's
// frontend_routing settings.
definePageMeta({
  name: 'news',
  path: '/news',
  languageMapping: { de: '/aktuelles', fr: '/actualites' },
  drupalFrontendRoute: true,
  layout: 'drupal',
})
</script>
