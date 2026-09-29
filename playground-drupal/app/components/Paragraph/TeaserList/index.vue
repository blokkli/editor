<template>
  <section
    class="flex flex-col gap-6"
    :class="[
      { hidden: !items.length && !isEditing },
      parentType ? '' : isCards ? 'container-wide' : 'container-content',
    ]"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2
        v-blokkli-editable:field_title
        :data-placeholder="source.title"
        class="editable-placeholder font-serif text-h2"
      >
        {{ isEditing ? title : title || source.title }}
      </h2>
      <ArrowLink to="#">{{ source.all }}</ArrowLink>
    </div>
    <div
      v-if="items.length"
      :class="
        isCards
          ? 'grid gap-x-grid gap-y-10 md:grid-cols-3'
          : 'border-t border-ink'
      "
    >
      <NodeTeaser
        v-for="item in items"
        :key="item.url?.path"
        :node="item"
        :display="isCards ? 'card' : 'list'"
      />
    </div>
    <p v-else class="bg-surface p-4 text-muted">{{ source.empty }}</p>
  </section>
</template>

<script lang="ts" setup>
import {
  computed,
  defineBlokkli,
  useAsyncGraphqlQuery,
  useEasyTexts,
} from '#imports'
import type {
  NodeTeaserFragment,
  ParagraphTeaserListFragment,
} from '#graphql-operations'
import ArrowLink from '~/components/ArrowLink/index.vue'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import { useLanguage } from '~/composables/useLanguage'

// The three latest news items, the next three events or the three current
// official publications. The title replaces the source's default. The link to
// all of them leads nowhere until the overview pages are designed (15f). Cards
// only at full width, directly on an editorial page; a list everywhere else.
defineProps<ParagraphTeaserListFragment>()

// Before the await: the editor needs the definition during setup.
const { options, parentType, provider } = defineBlokkli({
  bundle: 'teaser_list',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    source: {
      type: 'radios',
      label: { en: 'Content', de: 'Inhalt', fr: 'Contenu' },
      default: 'news',
      options: {
        news: { label: { en: 'News', de: 'News', fr: 'Actualités' } },
        events: {
          label: { en: 'Events', de: 'Veranstaltungen', fr: 'Événements' },
        },
        publications: {
          label: {
            en: 'Official publications',
            de: 'Amtliche Publikationen',
            fr: 'Publications officielles',
          },
        },
      },
    },
  },
  editor: {
    icon: 'bk_mdi_dynamic_feed',
    editTitle: (el) => el.querySelector('h2')?.textContent,
  },
})

const { $texts } = useEasyTexts()
const language = useLanguage()

const isEditing = import.meta.blokkliEditing

// Publications have no image: always a list.
const isCards = computed(
  () =>
    !parentType.value &&
    provider.value?.bundle === 'editorial' &&
    options.value.source !== 'publications',
)

const source = computed(() => {
  switch (options.value.source) {
    case 'events':
      return {
        title: $texts('teaser_list.events', 'Events'),
        all: $texts('teaser_list.events_all', 'All events'),
        empty: $texts('teaser_list.events_empty', 'No upcoming events.'),
      }
    case 'publications':
      return {
        title: $texts('teaser_list.publications', 'Official publications'),
        all: $texts('teaser_list.publications_all', 'All publications'),
        empty: $texts(
          'teaser_list.publications_empty',
          'No current publications.',
        ),
      }
  }
  return {
    title: $texts('teaser_list.news', 'News'),
    all: $texts('teaser_list.news_all', 'All news'),
    empty: $texts('teaser_list.news_empty', 'No news.'),
  }
})

// Today in UTC, as the date fields store it: the same on the server and in the
// browser, and cacheable for a day. Events that end today are still upcoming,
// and publications whose period ends today still current.
const today = new Date().toISOString().slice(0, 10)

const variables = computed(() => {
  const published = {
    field: 'status',
    value: ['1'],
    language: language.value,
  }
  switch (options.value.source) {
    case 'events':
      return {
        filter: {
          conditions: [
            { field: 'type', value: ['event'] },
            published,
            {
              field: 'field_date.end_value',
              value: [today],
              operator: 'GREATER_THAN_OR_EQUAL' as const,
            },
          ],
        },
        sort: [{ field: 'field_date.value', direction: 'ASC' as const }],
      }
    case 'publications':
      return {
        filter: {
          conditions: [
            { field: 'type', value: ['publication'] },
            published,
            {
              field: 'field_period.end_value',
              value: [today],
              operator: 'GREATER_THAN_OR_EQUAL' as const,
            },
          ],
        },
        sort: [{ field: 'field_period.value', direction: 'DESC' as const }],
      }
  }
  return {
    filter: { conditions: [{ field: 'type', value: ['news'] }, published] },
    sort: [{ field: 'created', direction: 'DESC' as const }],
  }
})

const { data } = await useAsyncGraphqlQuery('teaserList', variables)

const items = computed(() =>
  (data.value?.data.entityQuery.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)
</script>
