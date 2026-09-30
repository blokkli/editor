<template>
  <article class="host-layout">
    <div>
      <slot name="header" />
    </div>
    <div>
      <slot />
    </div>
  </article>
</template>

<script lang="ts" setup>
// A host's header and blocks. The detail page has its own layout, with a
// sidebar (Node/Page).
</script>

<style>
@reference '../../../assets/css/main.css';

/* A class in the components layer, so that a host can change the gap with a
   utility (Node/Editorial). */
@layer components {
  .host-layout {
    @apply flex flex-col gap-10 pb-section;
  }
}
</style>
