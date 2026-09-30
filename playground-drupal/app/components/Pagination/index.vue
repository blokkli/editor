<template>
  <nav v-if="pages > 1" :aria-label="$texts('pagination.label', 'Pages')">
    <ul class="flex flex-wrap items-center gap-1">
      <li>
        <NuxtLink
          v-if="page > 1"
          :to="to(page - 1)"
          :aria-label="$texts('pagination.previous', 'Previous page')"
          :aria-current="undefined"
          :class="BOX"
          class="border-line hover:border-ink"
        >
          <SpriteSymbol name="arrow-left" class="size-5 text-primary" />
        </NuxtLink>
        <span v-else :class="BOX" class="border-line text-line">
          <SpriteSymbol name="arrow-left" class="size-5" />
        </span>
      </li>
      <li v-for="(item, index) in items" :key="index">
        <span v-if="item === null" class="px-1 text-muted">…</span>
        <NuxtLink
          v-else
          :to="to(item)"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="
            $texts('pagination.page', 'Page @page', { '@page': item })
          "
          :class="[
            BOX,
            item === page
              ? 'border-primary bg-primary text-white'
              : 'border-line hover:border-ink',
          ]"
        >
          {{ item }}
        </NuxtLink>
      </li>
      <li>
        <NuxtLink
          v-if="page < pages"
          :to="to(page + 1)"
          :aria-label="$texts('pagination.next', 'Next page')"
          :aria-current="undefined"
          :class="BOX"
          class="border-line hover:border-ink"
        >
          <SpriteSymbol name="arrow-right" class="size-5 text-primary" />
        </NuxtLink>
        <span v-else :class="BOX" class="border-line text-line">
          <SpriteSymbol name="arrow-right" class="size-5" />
        </span>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { NuxtLink, SpriteSymbol } from '#components'
import type { RouteLocationRaw } from 'vue-router'

// The pages of a list, as links (the parent builds them, e.g. with ?page=).
// The first, the last and the ones around the current page, with an ellipsis
// for the gaps. Hidden with a single page. Every link sets aria-current itself:
// RouterLink ignores the query and would mark them all as the current page.
const props = defineProps<{
  page: number
  pages: number
  to: (page: number) => RouteLocationRaw
}>()

const BOX =
  'flex size-11 items-center justify-center border font-semibold tabular-nums'

const items = computed(() => {
  const list: (number | null)[] = []
  for (let item = 1; item <= props.pages; item++) {
    if (
      item === 1 ||
      item === props.pages ||
      Math.abs(item - props.page) <= 1
    ) {
      list.push(item)
    } else if (list[list.length - 1] !== null) {
      list.push(null)
    }
  }
  return list
})
</script>
