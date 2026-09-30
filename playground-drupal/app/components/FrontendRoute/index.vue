<template>
  <SiteShell
    v-if="entity"
    :site-config="data?.data.siteConfig"
    :footer-config="data?.data.footerConfig"
    :menu
    :breadcrumb
    :language-links
  >
    <NodeEditorial v-bind="entity" :breadcrumb :sub-pages>
      <template v-if="$slots.header" #header="header">
        <slot name="header" v-bind="header" />
      </template>
      <slot />
    </NodeEditorial>
  </SiteShell>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import { NodeEditorial, SiteShell } from '#components'
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

// Hidden while editing (the editor has its own switch) and previewing (the
// links would leave the preview).
const languageLinks = computed(() => {
  const url = data.value?.data.route
  if (
    route.query.blokkliEditing ||
    route.query.blokkliPreview ||
    !url ||
    !('languageSwitchLinks' in url)
  ) {
    return null
  }
  return url.languageSwitchLinks
})

const breadcrumb = computed(() => {
  const url = data.value?.data.route
  return url && 'breadcrumb' in url ? url.breadcrumb : []
})

const menu = computed(() => data.value?.data.mainMenu?.links ?? [])

const subPages = computed(() => findSubPages(menu.value, route.path))

// No node assigned to the route yet (frontend_routing's settings).
if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
