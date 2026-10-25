<template>
  <BlokkliDrupalEditTemplate :id />
</template>

<script lang="ts" setup>
import BlokkliDrupalEditTemplate from '#blokkli/drupal/components/BlokkliDrupalEditTemplate/index.vue'

// A template's canonical URL: /<lang>/blokkli/template/{id}. Drupal and the
// editor both link here.
const id = String(useRoute().params.id)
</script>
