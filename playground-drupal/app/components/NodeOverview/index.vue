<template>
  <section
    class="flex flex-col gap-6 not-first:mt-heading"
    :class="isCards ? 'container-wide' : 'container-content'"
  >
    <FilterChips
      v-if="chips"
      :label="$texts('filter.label', 'Filter')"
      :items="chips"
    />
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
    <p v-else class="bg-surface p-4 text-muted">{{ empty }}</p>
    <Pagination :page :pages :to="pageLink" />
  </section>
</template>

<script lang="ts" setup>
import {
  computed,
  useAsyncGraphqlQuery,
  useEasyTexts,
  useRoute,
} from '#imports'
import type { NodeTeaserFragment } from '#graphql-operations'
import type { LocationQueryRaw } from 'vue-router'
import FilterChips from '~/components/FilterChips/index.vue'
import NodeTeaser from '~/components/NodeTeaser/index.vue'
import Pagination from '~/components/Pagination/index.vue'
import {
  EVENT_CATEGORIES,
  useEventCategory,
} from '~/composables/useEventCategory'
import { useLanguage } from '~/composables/useLanguage'
import {
  PUBLICATION_TYPES,
  usePublicationType,
} from '~/composables/usePublicationType'
import { nodeListVariables, type NodeListSource } from '~/helpers/nodeList'

// All news, events or official publications, with pages: the part of an
// overview page after its node (pages/news.vue etc.). Events can be filtered
// by category, publications by type. The page and the filter are the URL's
// query (?page=2&category=sport), so a filtered page can be shared.
const props = defineProps<{
  source: NodeListSource
}>()

const { $texts } = useEasyTexts()
const route = useRoute()
const language = useLanguage()
const eventCategory = useEventCategory()
const publicationType = usePublicationType()

// News have images: cards. The others are rows with a date or an icon.
const isCards = computed(() => props.source === 'news')
const pageSize = computed(() => (isCards.value ? 6 : 8))

// The query's key for the filter, and its values with their labels.
const filterKey = computed(() =>
  props.source === 'publications' ? 'type' : 'category',
)

const filterValues = computed<{ value: string; label: string }[] | null>(() => {
  switch (props.source) {
    case 'events':
      return EVENT_CATEGORIES.map((value) => ({
        value,
        label: eventCategory(value),
      }))
    case 'publications':
      return PUBLICATION_TYPES.map((value) => ({
        value,
        // Otherwise "Official publication", as in a publication's meta.
        label:
          value === 'other'
            ? $texts('publication.type_other', 'Other')
            : publicationType(value),
      }))
  }
  return null
})

// A value that isn't one of the field's is ignored.
const filter = computed(() => {
  const value = route.query[filterKey.value]
  return filterValues.value?.find((item) => item.value === value)?.value
})

const page = computed(() => {
  const value = Number.parseInt(String(route.query.page ?? '1'), 10)
  return Number.isNaN(value) || value < 1 ? 1 : value
})

// A link to the same page with other query values. A new filter starts on
// the first page.
function link(query: LocationQueryRaw) {
  return { query: { ...route.query, page: undefined, ...query } }
}

function pageLink(value: number) {
  return link({ page: value > 1 ? String(value) : undefined })
}

const chips = computed(() => {
  if (!filterValues.value) {
    return null
  }
  return [
    {
      label: $texts('filter.all', 'All'),
      to: link({ [filterKey.value]: undefined }),
      active: !filter.value,
    },
    ...filterValues.value.map((item) => ({
      label: item.label,
      to: link({ [filterKey.value]: item.value }),
      active: filter.value === item.value,
    })),
  ]
})

// Today in UTC, as the date fields store it (see helpers/nodeList.ts).
const today = new Date().toISOString().slice(0, 10)

const variables = computed(() => ({
  ...nodeListVariables(props.source, {
    language: language.value,
    today,
    category: filter.value,
  }),
  limit: pageSize.value,
  offset: (page.value - 1) * pageSize.value,
}))

const { data } = await useAsyncGraphqlQuery('nodeList', variables)

const items = computed(() =>
  (data.value?.data.entityQuery.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)

const pages = computed(() =>
  Math.ceil((data.value?.data.entityQuery.total ?? 0) / pageSize.value),
)

const empty = computed(() => {
  switch (props.source) {
    case 'events':
      return $texts('teaser_list.events_empty', 'No upcoming events.')
    case 'publications':
      return $texts(
        'teaser_list.publications_empty',
        'No current publications.',
      )
  }
  return $texts('teaser_list.news_empty', 'No news.')
})
</script>
