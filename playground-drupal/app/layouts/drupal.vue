<template>
  <div class="flex min-h-screen flex-col">
    <ClientOnly>
      <div
        v-if="isVisible"
        class="hidden border-b border-line bg-white lg:block"
      >
        <VuepalAdminToolbar :key="language" />
        <VuepalLocalTasks class="container-wide py-2.5 not-has-[li]:hidden" />
      </div>
    </ClientOnly>
    <slot />
  </div>
</template>

<script lang="ts" setup>
import { computed, useAsyncGraphqlQuery, useRoute } from '#imports'
import { ClientOnly, VuepalAdminToolbar, VuepalLocalTasks } from '#components'
import { useLanguage } from '~/composables/useLanguage'

// The layout of the site's pages: Drupal's toolbar and the route's local tasks
// (view, edit, translate…) above the page, from lg (both are too wide below).
// It stays mounted between pages, so the toolbar loads once per language.
const route = useRoute()
const language = useLanguage()

// Only in the browser: the server renders for anonymous users only (see
// server/middleware/spa.ts).
const { data } = useAsyncGraphqlQuery('adminToolbarAccess', null, {
  server: false,
})

// The editor has its own toolbar, and a preview's links would leave it.
const isVisible = computed(
  () =>
    data.value?.data.currentUser?.accessToolbar &&
    !route.query.blokkliEditing &&
    !route.query.blokkliPreview,
)
</script>
