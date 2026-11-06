<template>
  <NodeEditorial v-bind="props" :breadcrumb :sub-pages>
    <template v-if="$slots.header" #header="header">
      <slot name="header" v-bind="header" />
    </template>
    <slot />
  </NodeEditorial>
</template>

<script lang="ts" setup>
import type { NodeEditorialFragment } from '#graphql-operations'

// A hardcoded page on top of its Drupal node: the overviews and the search.
// The page's definePageMeta (drupalFrontendRoute, languageMapping) gives it a
// path per language; vuepal writes them into frontend_routing's config, which
// locks the aliases of the node assigned to it. The page loads that node
// (useEditorialRoute()), an editorial page, which brings the header and
// blocks; the page's own part follows in the slot.
const props = defineProps<NodeEditorialFragment>()

const route = useRoute()

const breadcrumb = useBreadcrumb()

const { mainMenuLinks } = useInitData()

const subPages = computed(() => findSubPages(mainMenuLinks.value, route.path))
</script>
