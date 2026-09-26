<template>
  <main class="container-content py-20">
    <template v-if="error.statusCode === 403">
      <h1 class="text-3xl font-bold">This sandbox is private</h1>
      <p class="mt-4">
        <a :href="loginUrl" class="underline">Log in</a> to see its pages.
      </p>
    </template>
    <template v-else-if="error.statusCode === 404">
      <h1 class="text-3xl font-bold">Page not found</h1>
      <p class="mt-4">
        Pages are listed in the
        <a href="/en/admin/content" class="underline">content overview</a>, or
        <a href="/en/node/add/page" class="underline">add a page</a>.
      </p>
    </template>
    <template v-else>
      <h1 class="text-3xl font-bold">Something went wrong</h1>
      <p class="mt-4">{{ error.statusMessage || error.message }}</p>
    </template>
  </main>
</template>

<script lang="ts" setup>
import { computed, useRoute } from '#imports'
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const route = useRoute()

const loginUrl = computed(
  () => '/user/login?destination=' + encodeURIComponent(route.fullPath),
)
</script>
