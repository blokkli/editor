<template>
  <div v-if="entity" class="flex min-h-screen flex-col">
    <ConfigPageSite v-if="siteConfig" v-bind="siteConfig" :language-links />
    <main id="main" class="grow overflow-x-clip">
      <NodePage v-if="entity.__typename === 'NodePage'" v-bind="entity" />
      <NodeEditorial
        v-else-if="entity.__typename === 'NodeEditorial'"
        v-bind="entity"
      />
      <NodeNews v-else-if="entity.__typename === 'NodeNews'" v-bind="entity" />
      <NodeEvent
        v-else-if="entity.__typename === 'NodeEvent'"
        v-bind="entity"
      />
      <NodeOffice
        v-else-if="entity.__typename === 'NodeOffice'"
        v-bind="entity"
      />
      <!-- A config page on its own route, where it's edited. -->
      <p v-else class="container-wide py-section text-small text-muted">
        {{ entity.label }}
      </p>
    </main>
    <ConfigPageFooter
      v-if="footerConfig"
      v-bind="footerConfig"
      :site-name="siteConfig?.siteName"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import {
  ConfigPageFooter,
  ConfigPageSite,
  NodeEditorial,
  NodeEvent,
  NodeNews,
  NodeOffice,
  NodePage,
} from '#components'
import { getLanguageFromPath } from '#shared/languages'

const route = useRoute()

if (!getLanguageFromPath(route.path)) {
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
    case 'TranslatableConfigPagesFooter':
    case 'TranslatableConfigPagesSite':
      return url.entity
  }
  return null
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

// On a config page's own route, the config page is the entity being edited.
const siteConfig = computed(() =>
  entity.value?.__typename === 'TranslatableConfigPagesSite'
    ? entity.value
    : data.value?.data.siteConfig,
)

const footerConfig = computed(() =>
  entity.value?.__typename === 'TranslatableConfigPagesFooter'
    ? entity.value
    : data.value?.data.footerConfig,
)

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
