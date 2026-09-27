<template>
  <main class="container-content py-20">
    <!-- English: anonymous users get no texts (see easyTexts.loader.ts). -->
    <template v-if="error.statusCode === 403">
      <h1 class="text-3xl font-bold">This sandbox is private</h1>
      <p class="mt-4">
        <a :href="loginUrl" class="underline">Log in</a> to see its pages.
      </p>
    </template>
    <template v-else-if="error.statusCode === 404">
      <h1 class="text-3xl font-bold">
        {{ $texts('error.not_found', 'Page not found') }}
      </h1>
      <p class="mt-4 flex gap-4">
        <a :href="`/${language}/admin/content`" class="underline">
          {{ $texts('error.content_overview', 'Content overview') }}
        </a>
        <a :href="`/${language}/node/add/page`" class="underline">
          {{ $texts('error.add_page', 'Add a page') }}
        </a>
      </p>
    </template>
    <template v-else>
      <h1 class="text-3xl font-bold">
        {{ $texts('error.unknown', 'Something went wrong') }}
      </h1>
      <p class="mt-4">{{ error.statusMessage || error.message }}</p>
    </template>
  </main>
</template>

<script lang="ts" setup>
import { computed, useHead, useRoute } from '#imports'
import type { NuxtError } from '#app'
import { useLanguage } from '~/composables/useLanguage'

defineProps<{
  error: NuxtError
}>()

const route = useRoute()
const language = useLanguage()

// The error page replaces app.vue.
useHead({ htmlAttrs: { lang: language } })

const loginUrl = computed(
  () => '/user/login?destination=' + encodeURIComponent(route.fullPath),
)
</script>
