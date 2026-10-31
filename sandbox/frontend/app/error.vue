<template>
  <main class="container-content py-20">
    <h1 class="font-serif text-h1" data-test="error-title">{{ title }}</h1>
    <!-- English: anonymous users get no texts (see easyTexts.loader.ts). -->
    <p v-if="error.statusCode === 403" class="mt-4">
      <a :href="loginUrl" class="underline">Log in</a> to see its pages.
    </p>
    <p v-else-if="error.statusCode === 404" class="mt-4 flex gap-4">
      <a :href="`/${language}/admin/content`" class="underline">
        {{ $texts('error.content_overview', 'Content overview') }}
      </a>
      <a :href="`/${language}/node/add/page`" class="underline">
        {{ $texts('error.add_page', 'Add a page') }}
      </a>
    </p>
    <p v-else class="mt-4">{{ error.statusMessage || error.message }}</p>
  </main>
</template>

<script lang="ts" setup>
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const route = useRoute()
const language = useLanguage()
const { $texts } = useEasyTexts()

// Also the page's title. 403: English, as in the template.
const title = computed(() => {
  switch (props.error.statusCode) {
    case 403:
      return 'This sandbox is private'
    case 404:
      return $texts('error.not_found', 'Page not found')
  }
  return $texts('error.unknown', 'Something went wrong')
})

// The error page replaces app.vue.
useHead({ title, htmlAttrs: { lang: language } })

const loginUrl = computed(
  () => '/user/login?destination=' + encodeURIComponent(route.fullPath),
)
</script>
