<template>
  <section :aria-label="$texts('today.label', 'Today')" class="container-wide">
    <div
      class="grid divide-y divide-line border-y border-t-ink border-b-line md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      <div
        v-for="item in items"
        :key="item.label"
        class="flex flex-col gap-1 py-5 md:px-6 md:first:pl-0"
      >
        <h2 class="text-label text-muted uppercase">{{ item.label }}</h2>
        <p class="flex items-center gap-2 font-semibold">
          <span v-if="item.open" class="size-2.5 shrink-0 bg-success" />
          {{ item.value }}
        </p>
        <a
          v-if="item.link"
          href="#"
          class="text-small text-primary underline hover:text-primary-dark"
        >
          {{ item.link }}
        </a>
        <p v-else class="text-small text-muted">{{ item.note }}</p>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, defineBlokkliFragment, useEasyTexts } from '#imports'

// What's on today: the town hall's hours, the next waste collection and the
// next assembly, for the home page only. Fixed texts for now, which go stale;
// computing them is a todo (15f). The links lead nowhere yet.
defineBlokkliFragment({
  name: 'today',
  label: 'Today',
  description:
    "The town hall's hours, the next collection and the next assembly.",
  editor: {
    icon: 'bk_mdi_today',
    previewWidth: 800,
  },
})

const { $texts } = useEasyTexts()

const items = computed<
  {
    label: string
    value: string
    open?: boolean
    note?: string
    link?: string
  }[]
>(() => [
  {
    label: $texts('today.town_hall', 'Town hall'),
    value: $texts('today.town_hall_open', 'Open today'),
    open: true,
    note: $texts('today.town_hall_hours', '8:00–11:30 and 14:00–17:00'),
  },
  {
    label: $texts('today.collection', 'Next collection'),
    value: $texts(
      'today.collection_value',
      'Household waste · Tuesday, 6 October',
    ),
    link: $texts('today.collection_link', 'Collection calendar'),
  },
  {
    label: $texts('today.assembly', 'Municipal assembly'),
    value: $texts('today.assembly_value', 'Wednesday, 2 December 2026'),
    link: $texts('today.assembly_link', 'Agenda'),
  },
])
</script>
