<template>
  <article class="host-layout" :class="{ 'has-sidebar': sidebar }">
    <div class="host-layout-header">
      <slot name="header" />
    </div>
    <div class="host-layout-body">
      <slot />
    </div>
    <aside
      v-if="$slots.aside"
      class="host-layout-aside"
      :class="{ 'is-editing': isEditing }"
    >
      <slot name="aside" />
    </aside>
  </article>
</template>

<script lang="ts" setup>
// A host's header, blocks and sidebar. The sidebar layout (main.css) is for
// detail pages only.
defineProps<{
  sidebar?: boolean
  // While editing, an empty sidebar stays a drop zone.
  isEditing?: boolean
}>()
</script>
