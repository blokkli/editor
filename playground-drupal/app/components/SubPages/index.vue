<template>
  <nav
    :aria-label="$texts('subpages.label', 'In this section')"
    class="container-wide"
  >
    <ul class="grid gap-x-grid gap-y-8 md:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in items" :key="item.url">
        <SiteLink
          :to="item.url"
          class="group flex h-full flex-col gap-2 border-t border-ink pt-4 text-ink"
        >
          <span
            class="flex items-start justify-between gap-4 font-serif text-h3 font-semibold group-hover:text-primary group-hover:underline"
          >
            {{ item.label }}
            <SpriteSymbol
              name="arrow-right"
              class="mt-1 size-5 shrink-0 text-primary"
            />
          </span>
          <span v-if="item.description" class="text-muted">
            {{ item.description }}
          </span>
        </SiteLink>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { SiteLink, SpriteSymbol } from '#components'

// An editorial page's children in the main menu, with the menu links'
// descriptions.
defineProps<{
  items: { label: string; url: string; description?: string | null }[]
}>()
</script>
