<template>
  <FrontendRoute>
    <NodeOverview source="events" />
  </FrontendRoute>
</template>

<script lang="ts" setup>
import { definePageMeta } from '#imports'
import { FrontendRoute, NodeOverview } from '#components'

// The upcoming events, by category. The node is assigned in Drupal's
// frontend_routing settings.
definePageMeta({
  name: 'events',
  path: '/events',
  languageMapping: { de: '/veranstaltungen', fr: '/evenements' },
  drupalFrontendRoute: true,
  layout: 'drupal',
})
</script>
