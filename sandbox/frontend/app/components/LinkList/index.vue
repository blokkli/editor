<template>
  <ul class="border-t border-ink">
    <LinkListItem
      v-for="item in items"
      :key="item.url + item.label"
      v-bind="item"
    />
  </ul>
</template>

<script lang="ts" setup>
// A list of links and downloads, e.g. "Traktandenliste … PDF · 120 KB". The
// link list block renders its link blocks as the rows instead.
defineProps<{
  items: { label: string; url: string; meta?: string; download?: boolean }[]
}>()
</script>
