<template>
  <NodeEditorial v-if="entity" v-bind="entity" :breadcrumb :sub-pages>
    <template v-if="$slots.header" #header="header">
      <slot name="header" v-bind="header" />
    </template>
    <slot />
  </NodeEditorial>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import { NodeEditorial } from '#components'
import { useLayoutQuery } from '~/composables/useLayoutQuery'
import { findSubPages } from '~/helpers/menu'

// A hardcoded page on top of its Drupal node: the overviews and the search.
// The page's definePageMeta (drupalFrontendRoute, languageMapping) gives it a
// path per language; vuepal writes them into frontend_routing's config, which
// locks the aliases of the node assigned to it. The node, an editorial page,
// brings the header and blocks; the page's own part follows in the slot.
const route = useRoute()

const { data, error } = await useAsyncGraphqlQuery(
  'route',
  computed(() => ({ path: route.path })),
)

if (error.value) {
  // 403: anonymous users, who can't see anything.
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
}

const entity = computed(() => {
  const url = data.value?.data.route
  return url && 'entity' in url && url.entity?.__typename === 'NodeEditorial'
    ? url.entity
    : null
})

const breadcrumb = computed(() => {
  const url = data.value?.data.route
  return url && 'breadcrumb' in url ? url.breadcrumb : []
})

const { data: layout } = await useLayoutQuery()

const subPages = computed(() =>
  findSubPages(layout.value?.mainMenu?.links ?? [], route.path),
)

// No node assigned to the route yet (frontend_routing's settings).
if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
