<template>
  <NodePage
    v-if="entity?.__typename === 'NodePage'"
    v-bind="entity"
    :breadcrumb
  />
  <NodeEditorial
    v-else-if="entity?.__typename === 'NodeEditorial'"
    v-bind="entity"
    :breadcrumb
    :sub-pages
  />
  <NodeNews
    v-else-if="entity?.__typename === 'NodeNews'"
    v-bind="entity"
    :breadcrumb
  />
  <NodeEvent
    v-else-if="entity?.__typename === 'NodeEvent'"
    v-bind="entity"
    :breadcrumb
  />
  <NodeOffice
    v-else-if="entity?.__typename === 'NodeOffice'"
    v-bind="entity"
    :breadcrumb
  />
  <NodePublication
    v-else-if="entity?.__typename === 'NodePublication'"
    v-bind="entity"
    :breadcrumb
  />
  <p v-else-if="entity" class="container-wide py-section text-small text-muted">
    {{ entity.label }}
  </p>
</template>

<script lang="ts" setup>
import {
  computed,
  createError,
  definePageMeta,
  navigateTo,
  useAsyncGraphqlQuery,
  useRoute,
} from '#imports'
import {
  NodeEditorial,
  NodeEvent,
  NodeNews,
  NodeOffice,
  NodePage,
  NodePublication,
} from '#components'
import { getLanguageFromPath } from '#shared/languages'
import { useLayoutQuery } from '~/composables/useLayoutQuery'
import { findSubPages } from '~/helpers/menu'

definePageMeta({ layout: 'drupal' })

const route = useRoute()

const language = getLanguageFromPath(route.path)

if (!language) {
  throw createError({ statusCode: 404, fatal: true })
}

const { data, error } = await useAsyncGraphqlQuery(
  'route',
  computed(() => ({ path: route.path })),
)

if (error.value) {
  // 403: anonymous users, who can't see anything.
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
}

// The front page (node 1, system.site.page.front) has its own page component
// (pages/index.vue). Its alias, e.g. from Drupal's "View" tab or the
// editor's lists, leads there, with the query (editing, previewing).
const routeUrl = data.value?.data.route
if (
  routeUrl &&
  'entity' in routeUrl &&
  routeUrl.entity?.__typename === 'NodeEditorial' &&
  routeUrl.entity.id === '1'
) {
  await navigateTo({ path: `/${language}`, query: route.query })
}

// A config page on its own route, where it's edited: the layout renders it,
// the page only its label.
const entity = computed(() => {
  const url = data.value?.data.route
  if (!url || !('entity' in url) || !url.entity) {
    return null
  }
  switch (url.entity.__typename) {
    case 'NodePage':
    case 'NodeEditorial':
    case 'NodeNews':
    case 'NodeEvent':
    case 'NodeOffice':
    case 'NodePublication':
    case 'TranslatableConfigPagesFooter':
    case 'TranslatableConfigPagesSite':
      return url.entity
  }
  return null
})

const breadcrumb = computed(() => {
  const url = data.value?.data.route
  return url && 'breadcrumb' in url ? url.breadcrumb : []
})

const { data: layout } = await useLayoutQuery()

const subPages = computed(() =>
  findSubPages(layout.value?.mainMenu?.links ?? [], route.path),
)

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
