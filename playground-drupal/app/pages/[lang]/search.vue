<template>
  <SiteShell
    :site-config="data?.data.siteConfig"
    :footer-config="data?.data.footerConfig"
    :menu
    :language-links
  >
    <div class="band container-content flex flex-col gap-8 py-8 lg:py-12">
      <h1 class="font-serif text-h1">
        {{ $texts('search.title', 'Search') }}
      </h1>
      <SearchField
        :label="$texts('header.search_label', 'Search the website')"
        large
      />
    </div>
  </SiteShell>
</template>

<script lang="ts" setup>
import {
  computed,
  createError,
  definePageMeta,
  useAsyncGraphqlQuery,
  useEasyTexts,
  useHead,
  useRoute,
} from '#imports'
import { SearchField, SiteShell } from '#components'
import type { LanguageSwitchLinkFragment } from '#graphql-operations'
import { LANGUAGE_NAMES, LANGUAGES, isLanguage } from '#shared/languages'

// The header's search links here. There's no search yet: the field does
// nothing. Drupal has no route at this path, so the route query only brings
// the site's header, footer and main menu.
definePageMeta({ layout: 'drupal' })

const route = useRoute()

if (!isLanguage(route.params.lang)) {
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

const menu = computed(() => data.value?.data.mainMenu?.links ?? [])

const languageLinks = computed<LanguageSwitchLinkFragment[]>(() =>
  LANGUAGES.map((id) => ({
    title: LANGUAGE_NAMES[id],
    language: { id },
    url: { path: `/${id}/search` },
  })),
)

const { $texts } = useEasyTexts()

useHead({ title: () => $texts('search.title', 'Search') })
</script>
