<template>
  <div class="flex min-h-screen flex-col">
    <ClientOnly>
      <div
        v-if="isToolbarVisible"
        class="hidden border-b border-line bg-white lg:block"
      >
        <VuepalAdminToolbar :key="language" />
        <VuepalLocalTasks class="container-wide py-2.5 not-has-[li]:hidden" />
      </div>
    </ClientOnly>
    <ConfigPageSite
      v-if="layout?.siteConfig"
      v-bind="layout.siteConfig"
      :language-links
      :links="menuLinks"
    />
    <main id="main" class="grow overflow-x-clip">
      <slot />
    </main>
    <ConfigPageFooter
      v-if="layout?.footerConfig"
      v-bind="layout.footerConfig"
      :site-name="layout.siteConfig?.siteName"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, useAsyncGraphqlQuery, useRoute } from '#imports'
import {
  ClientOnly,
  ConfigPageFooter,
  ConfigPageSite,
  VuepalAdminToolbar,
  VuepalLocalTasks,
} from '#components'
import { useLanguage } from '~/composables/useLanguage'
import { useLayoutQuery } from '~/composables/useLayoutQuery'

// The layout of the site's pages: Drupal's toolbar and the route's local tasks
// (view, edit, translate…) above the page, from lg (both are too wide below),
// then the header and the footer from their config pages. It stays mounted
// between pages: the toolbar, the config pages and the menu load once per
// language. A config page is edited on its own route, where the header or the
// footer here turns into the editor.
const route = useRoute()
const language = useLanguage()

const { data: layout } = await useLayoutQuery()

// The page's route query (pages/[...slug].vue, pages/index.vue and the
// frontend routes): the same path, so the same request. It brings the
// language links and the breadcrumb.
const { data: routeData } = await useAsyncGraphqlQuery(
  'route',
  computed(() => ({ path: route.path })),
)

// Only in the browser: the server renders for anonymous users only (see
// server/middleware/spa.ts).
const { data: toolbarAccess } = useAsyncGraphqlQuery(
  'adminToolbarAccess',
  null,
  { server: false },
)

const isEditingOrPreviewing = computed(
  () => !!route.query.blokkliEditing || !!route.query.blokkliPreview,
)

// The editor has its own toolbar, and a preview's links would leave it.
const isToolbarVisible = computed(
  () =>
    toolbarAccess.value?.data.currentUser?.accessToolbar &&
    !isEditingOrPreviewing.value,
)

// Hidden while editing (the editor has its own switch) and previewing (the
// links would leave the preview).
const languageLinks = computed(() => {
  const url = routeData.value?.data.route
  return isEditingOrPreviewing.value || !url || !('languageSwitchLinks' in url)
    ? null
    : url.languageSwitchLinks
})

// The header shows the main menu's first level. A link is active when it's in
// the breadcrumb or the current page.
const menuLinks = computed(() => {
  const url = routeData.value?.data.route
  const trail = (url && 'breadcrumb' in url ? url.breadcrumb : []).map(
    (item) => item.url.path,
  )
  return (layout.value?.mainMenu?.links ?? []).flatMap(({ link }) => {
    const path = link.url?.path
    return path
      ? [
          {
            label: link.label,
            url: path,
            isActive: path === route.path || trail.includes(path),
          },
        ]
      : []
  })
})
</script>
