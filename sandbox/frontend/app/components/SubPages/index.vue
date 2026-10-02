<template>
  <nav :aria-labelledby="headingId" class="container-wide flex flex-col gap-4">
    <h2 :id="headingId" class="text-label text-muted uppercase">
      {{ $texts('subpages.label', 'In this section') }}
    </h2>
    <ul class="grid gap-x-grid gap-y-8 md:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in items" :key="item.url">
        <SiteLink
          :to="item.url"
          class="group flex flex-col gap-2 border-t border-ink pt-4 text-ink"
          :class="{ 'h-full': !item.children.length }"
        >
          <h3
            class="flex items-start justify-between gap-4 font-serif text-h3 font-semibold group-hover:text-primary group-hover:underline"
          >
            {{ item.label }}
            <SpriteSymbol
              name="arrow-right"
              class="mt-1 size-5 shrink-0 text-primary"
            />
          </h3>
          <span
            v-if="item.description && !item.children.length"
            class="text-muted"
          >
            {{ item.description }}
          </span>
        </SiteLink>
        <ul v-if="item.children.length" class="mt-3 flex flex-col gap-2">
          <li v-for="child in item.children" :key="child.url">
            <SiteLink
              :to="child.url"
              class="text-ink hover:text-primary hover:underline"
            >
              {{ child.label }}
            </SiteLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { useId } from '#imports'
import { SiteLink, SpriteSymbol } from '#components'
import type { SubPage } from '~/helpers/menu'

// An editorial page's children in the main menu, with the menu links'
// descriptions. A child with children of its own, like an area's topic, lists
// them instead of its description. Under a heading of their own, so that a
// page with no blocks has an h2 too.
defineProps<{
  items: SubPage[]
}>()

const headingId = useId()
</script>
