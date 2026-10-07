<template>
  <BlokkliDrupalEditTemplate :uuid />
</template>

<script lang="ts" setup>
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

// The Drupal module opens templates by this route name (templateEditRouteName
// in nuxt.config.ts), in the editor's language: /en/blokkli/template/<uuid>.
definePageMeta({
  name: 'blokkli-template',
})

const uuid = String(useRoute().params.uuid)
</script>
