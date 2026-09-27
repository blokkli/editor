<template>
  <ul class="border-t border-ink">
    <li v-for="item in items" :key="item.url + item.label">
      <a
        :href="item.url"
        class="flex items-center gap-4 border-b border-line py-3.5 font-semibold text-ink hover:text-primary"
      >
        <SpriteSymbol
          v-if="download"
          name="download"
          class="size-5 shrink-0 text-primary"
        />
        <span class="grow">{{ item.label }}</span>
        <span
          v-if="item.meta"
          class="shrink-0 text-small font-normal text-muted"
        >
          {{ item.meta }}
        </span>
        <SpriteSymbol
          v-else-if="!download"
          name="arrow-right"
          class="size-5 shrink-0 text-primary"
        />
      </a>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { SpriteSymbol } from '#components'

// A list of links or downloads, e.g. "Traktandenliste … PDF · 120 KB".
defineProps<{
  items: { label: string; url: string; meta?: string }[]
  // A download icon before each label.
  download?: boolean
}>()
</script>
