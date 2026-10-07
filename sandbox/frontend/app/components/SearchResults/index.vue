<template>
  <section
    v-if="text"
    class="container-content flex flex-col gap-6 not-first:mt-heading"
  >
    <p role="status">
      <strong>{{ summary }}</strong>
      {{ total ? '' : $texts('search.no_results_hint', 'Try another word.') }}
    </p>
    <div v-if="items.length" class="border-t border-ink">
      <NodeTeaser
        v-for="item in items"
        :key="item.url?.path"
        :node="item"
        display="result"
      />
    </div>
    <Pagination :page :pages :to="pageLink" />
  </section>
</template>

<script lang="ts" setup>
import type { NodeTeaserFragment } from '#graphql-operations'

// The search page's results (pages/search.vue): the number of them, a page of
// rows and the pages. The text and the page are the URL's query
// (?text=bau&page=2), so a search can be shared.
const props = defineProps<{
  text: string
}>()

const PAGE_SIZE = 10

const { $texts } = useEasyTexts()
const route = useRoute()

const page = computed(() => {
  const value = Number.parseInt(String(route.query.page ?? '1'), 10)
  return Number.isNaN(value) || value < 1 ? 1 : value
})

function pageLink(value: number) {
  return {
    query: { ...route.query, page: value > 1 ? String(value) : undefined },
  }
}

// Without a text, the index isn't searched (see the data producer). The
// results keep the text they're for: while the next ones load, the URL
// already has the next text.
const { data } = await useAsyncGraphqlQuery(
  'search',
  computed(() => ({
    text: props.text,
    offset: (page.value - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  })),
  {
    transform: (response) => ({ text: props.text, ...response.data.search }),
  },
)

const total = computed(() => data.value?.total ?? 0)

const items = computed(() =>
  (data.value?.items ?? []).filter(
    (v): v is NodeTeaserFragment => !!v && '__typename' in v,
  ),
)

const pages = computed(() => Math.ceil(total.value / PAGE_SIZE))

const summary = computed(() => {
  const text = data.value?.text ?? props.text
  if (!total.value) {
    return $texts('search.no_results', 'No results for “@text”.', {
      '@text': text,
    })
  }
  if (total.value === 1) {
    return $texts('search.result', '1 result for “@text”', { '@text': text })
  }
  return $texts('search.results', '@count results for “@text”', {
    '@count': total.value,
    '@text': text,
  })
})
</script>
