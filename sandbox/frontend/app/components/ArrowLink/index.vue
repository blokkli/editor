<template>
  <SiteLink
    :to
    class="group inline-flex items-center gap-2 font-semibold text-primary"
  >
    <span class="group-hover:underline"><slot /></span>
    <SpriteSymbol name="arrow-right" class="size-5 shrink-0" />
  </SiteLink>
</template>

<script lang="ts" setup>
// A link with an arrow after its text, e.g. to all news above a list.
defineProps<{
  to?: string | null
}>()
</script>
