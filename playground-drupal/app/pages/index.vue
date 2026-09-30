<template>
  <SiteShell
    v-if="entity"
    :site-config="data?.data.siteConfig"
    :footer-config="data?.data.footerConfig"
    :menu
    :language-links
  >
    <NodeEditorial v-bind="entity" front-page>
      <template #header="{ entity: node, isEditing, options }">
        <HomeHero
          :title="node.title"
          :lead="node.lead"
          :image="node.hero"
          :variant="options.header"
          :is-editing
        />
      </template>
    </NodeEditorial>
  </SiteShell>
</template>

<script lang="ts" setup>
import {
  computed,
  createError,
  definePageMeta,
  useAsyncGraphqlQuery,
  useRoute,
} from '#imports'
import { HomeHero, NodeEditorial, SiteShell } from '#components'

// The front page: Drupal's front page (an editorial page) with a header of its
// own, with the search. Only its blocks can hold the fragments "today" and
// "quick_links". Every other path is [...slug].vue.
definePageMeta({ layout: 'drupal' })

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

const menu = computed(() => data.value?.data.mainMenu?.links ?? [])

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
