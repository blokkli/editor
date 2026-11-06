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
definePageMeta({ layout: 'drupal' })

const route = useRoute()

const language = getLanguageFromPath(route.path)

if (!language) {
  throw createError({ statusCode: 404, fatal: true })
}

const { entity: routeEntity, drupalRoute } = await useRouteQuery('slug')

// The front page (node 1, system.site.page.front) has its own page component
// (pages/index.vue). Its alias, e.g. from Drupal's "View" tab or the
// editor's lists, leads there, with the query (editing, previewing).
if (
  drupalRoute.value.entityType === 'node' &&
  drupalRoute.value.entityId === '1'
) {
  await navigateTo({ path: `/${language}`, query: route.query })
}

// A config page on its own route, where it's edited: the layout renders it,
// the page only its label.
const entity = computed(() => {
  switch (routeEntity.value?.__typename) {
    case 'NodePage':
    case 'NodeEditorial':
    case 'NodeNews':
    case 'NodeEvent':
    case 'NodeOffice':
    case 'NodePublication':
    case 'TranslatableConfigPagesFooter':
    case 'TranslatableConfigPagesSite':
      return routeEntity.value
  }
  return null
})

const breadcrumb = useBreadcrumb()

const { mainMenuLinks } = useInitData()

const subPages = computed(() => findSubPages(mainMenuLinks.value, route.path))

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}

await renderPageDependencies()
</script>
