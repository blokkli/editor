<template>
  <li>
    <SiteLink
      :to="url"
      class="flex items-center gap-3.5 border-b border-line py-4 font-semibold text-ink hover:text-primary"
    >
      <span class="size-3 shrink-0 bg-primary" aria-hidden="true" />
      <slot>{{ label }}</slot>
    </SiteLink>
  </li>
</template>

<script lang="ts" setup>
// A frequently searched link. The label can be a slot, e.g. to make it
// editable.
defineProps<{
  label?: string
  url?: string
}>()
</script>
