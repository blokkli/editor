<template>
  <div>
    <p
      v-if="tagline"
      v-blokkli-editable:tagline
      class="uppercase font-semibold text-xs mb-10"
    >
      {{ tagline }}
    </p>
    <h2 v-blokkli-editable:title v-text="title" class="font-bold" />
    <p v-if="lead" v-blokkli-editable:lead v-text="lead" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  title: string
  tagline?: string
  lead?: string
}>()
</script>
