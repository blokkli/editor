<template>
  <nav :aria-label="$texts('breadcrumb.label', 'Breadcrumb')">
    <ol class="flex flex-wrap gap-x-2 text-small text-muted">
      <li v-for="(item, index) in items" :key="index" class="flex gap-2">
        <span v-if="index > 0" aria-hidden="true">/</span>
        <SiteLink
          v-if="item.url"
          :to="item.url"
          class="underline hover:text-ink"
        >
          {{ item.label }}
        </SiteLink>
        <span v-else aria-current="page" class="text-ink">{{
          item.label
        }}</span>
      </li>
    </ol>
  </nav>
</template>

<script lang="ts" setup>
// The last item is the current page, without a link.
defineProps<{
  items: { label: string; url?: string }[]
}>()
</script>
