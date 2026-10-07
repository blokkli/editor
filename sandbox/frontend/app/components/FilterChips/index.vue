<template>
  <nav :aria-label="label">
    <ul class="flex flex-wrap gap-2">
      <li v-for="item in items" :key="item.label">
        <NuxtLink
          :to="item.to"
          :aria-current="item.active ? 'true' : undefined"
          class="inline-flex border px-3.5 py-1.5 text-small font-semibold"
          :class="
            item.active
              ? 'border-primary bg-primary text-white'
              : 'border-line text-ink hover:border-ink'
          "
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router'

// Filters as links, e.g. the categories above a list of events. Each sets its
// value in the URL's query, so a filtered list can be shared. One is active.
defineProps<{
  label: string
  items: { label: string; to: RouteLocationRaw; active: boolean }[]
}>()
</script>
