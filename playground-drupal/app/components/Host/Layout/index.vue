<template>
  <article class="host-layout" :class="{ 'is-aside-first': asideFirst }">
    <div class="host-layout-header">
      <slot name="header" />
    </div>
    <div class="host-layout-body">
      <slot />
    </div>
    <aside v-if="$slots.aside" class="host-layout-aside empty:hidden">
      <slot name="aside" />
    </aside>
  </article>
</template>

<script lang="ts" setup>
// A host's header, blocks and sidebar. The sidebar layout (main.css) is on
// while the sidebar contains an element with the class has-aside: the page's
// aside field sets it while it has blocks, events and offices always.
defineProps<{
  // Below lg, the sidebar comes before the blocks, e.g. an event's facts.
  asideFirst?: boolean
}>()
</script>
