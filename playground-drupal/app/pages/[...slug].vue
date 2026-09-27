<template>
  <template v-if="entity">
    <!-- A config page on its own route: where it's edited. -->
    <main
      v-if="
        entity.__typename === 'TranslatableConfigPagesFooter' ||
        entity.__typename === 'TranslatableConfigPagesSite'
      "
      class="py-12"
    >
      <p class="container-wide mb-8 text-sm text-stone-600">
        {{ entity.label }}
      </p>
      <ConfigPageFooter
        v-if="entity.__typename === 'TranslatableConfigPagesFooter'"
        v-bind="entity"
      />
      <ConfigPageSite v-else v-bind="entity" />
    </main>
    <template v-else>
      <ConfigPageSite v-if="site" v-bind="site">
        <LanguageSwitch v-if="languageLinks" :links="languageLinks" />
      </ConfigPageSite>
      <NodePage v-if="entity.__typename === 'NodePage'" v-bind="entity" />
      <NodeNews v-else-if="entity.__typename === 'NodeNews'" v-bind="entity" />
      <NodeEvent
        v-else-if="entity.__typename === 'NodeEvent'"
        v-bind="entity"
      />
      <NodeOffice
        v-else-if="entity.__typename === 'NodeOffice'"
        v-bind="entity"
      />
      <ConfigPageFooter v-if="footer" v-bind="footer" />
    </template>
  </template>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import {
  ConfigPageFooter,
  ConfigPageSite,
  LanguageSwitch,
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

const site = computed(() => data.value?.data.siteConfig)
const footer = computed(() => data.value?.data.footerConfig)

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
