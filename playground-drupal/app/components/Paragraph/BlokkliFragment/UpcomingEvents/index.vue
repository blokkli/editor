<template>
  <div
    class="container-content"
    :class="{ hidden: !items.length && !isEditing }"
  >
    <div
      v-if="items.length"
      class="divide-y divide-stone-300 border-y border-stone-300"
    >
      <NodeTeaser
        v-for="item in items"
        :key="item.url?.path"
        :node="item"
        display="list"
      />
    </div>
    <p v-else-if="isEditing" class="rounded-sm bg-stone-200 p-4 text-stone-600">
      {{ $texts('upcoming_events.empty', 'No upcoming events.') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkliFragment, useAsyncGraphqlQuery } from '#imports'
import type { NodeTeaserFragment } from '#graphql-operations'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import { useLanguage } from '~/composables/useLanguage'

// Before the await: the editor needs the definition during setup.
defineBlokkliFragment({
  name: 'upcoming_events',
  label: 'Upcoming events',
  description: 'The next three events.',
  editor: {
    icon: 'bk_mdi_event_upcoming',
    previewWidth: 800,
  },
})

const language = useLanguage()

// Today in UTC, as field_date stores it: the same on the server and in the
// browser, and cacheable for a day.
const today = new Date().toISOString().slice(0, 10) + 'T00:00:00'

const { data } = await useAsyncGraphqlQuery(
  'upcomingEvents',
  computed(() => ({ language: language.value, today })),
)

const items = computed(() =>
  (data.value?.data.events.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)

const isEditing = import.meta.blokkliEditing
</script>
