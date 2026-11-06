<template>
  <div class="flex min-h-screen flex-col">
    <ClientOnly>
      <div
        v-if="isToolbarVisible"
        class="hidden border-b border-line bg-white lg:block"
      >
        <VuepalAdminToolbar :key="language" />
        <div
          class="container-wide flex items-center justify-between gap-4 py-2.5 not-has-[li,button]:hidden"
        >
          <VuepalLocalTasks />
          <SandboxInfo />
        </div>
      </div>
    </ClientOnly>
    <NuxtPageDependency>
      <ConfigPageSite
        v-if="siteConfig"
        v-bind="siteConfig"
        :language-links
        :links="menuLinks"
      />
    </NuxtPageDependency>
    <main id="main" class="grow overflow-x-clip">
      <slot />
    </main>
    <ConfigPageFooter
      v-if="footerConfig"
      v-bind="footerConfig"
      :site-name="siteConfig?.siteName"
    />
  </div>
</template>

<script lang="ts" setup>
// The layout of the site's pages: Drupal's toolbar and the route's local tasks
// (view, edit, translate…) with the sandbox's button above the page, from lg
// (both are too wide below), then the header and the footer from their config
// pages. It stays mounted between pages: the toolbar, the config pages and the
// menu load once per language (plugins/initData.ts). A config page is edited
// on its own route, where the header or the footer here turns into the editor.
//
// The header's language switch and the menu's active trail come from the
// page's route query (useRouteQuery()), so the header renders once the page
// has called renderPageDependencies().
const route = useRoute()
const language = useLanguage()

const { siteConfig, footerConfig, mainMenuLinks } = useInitData()

// "<page title> – <site name>"; the front page sets no title: the site name.
// Drupal's metatags give the page's title.
const siteName = computed(() => siteConfig.value?.siteName)
useHead(() => {
  const name = siteName.value
  return {
    titleTemplate: (title?: string) =>
      title && name ? `${title} – ${name}` : title || name || null,
  }
})

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
const routeLanguageLinks = useLanguageLinks()
const languageLinks = computed(() =>
  isEditingOrPreviewing.value ? null : routeLanguageLinks.value,
)

// The header shows the main menu's first level. A link is active when it's in
// the breadcrumb or the current page.
const breadcrumb = useBreadcrumb()
const menuLinks = computed(() => {
  const trail = breadcrumb.value.map((item) => item.url.path)
  return mainMenuLinks.value.flatMap(({ link }) => {
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
