<template>
  <section class="container-wide flex flex-col gap-5">
    <h2 class="font-serif text-h2">
      {{ $texts('quick_links.title', 'Frequently searched') }}
    </h2>
    <slot>
      <ul class="grid gap-x-grid sm:grid-cols-2 lg:grid-cols-4">
        <QuickLinksItem
          v-for="item in items"
          :key="item.url + item.label"
          v-bind="item"
        />
      </ul>
    </slot>
  </section>
</template>

<script lang="ts" setup>
import QuickLinksItem from './Item.vue'

// The frequently searched links of the site config page, in four columns. The
// config page puts its paragraphs field in the slot.
defineProps<{
  items?: { label: string; url: string }[]
}>()
</script>
