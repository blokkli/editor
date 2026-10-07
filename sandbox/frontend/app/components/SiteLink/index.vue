<template>
  <NuxtLink v-if="to" :to :external="isDrupalPath(to)">
    <slot />
  </NuxtLink>
  <a v-else><slot /></a>
</template>

<script lang="ts" setup>
// A link the router follows when it's one of the site's pages. Other sites
// (NuxtLink detects them), files and Drupal's own pages (e.g. a node's edit
// form) load the whole page. Modifier keys and middle clicks work as usual.
// Without a URL (e.g. an office the visitor can't see), it's an anchor without
// href, as before.
defineProps<{ to?: string | null }>()
</script>
