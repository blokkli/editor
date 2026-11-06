<template>
  <FrontendRoute v-if="node" v-bind="node">
    <template #header="{ entity, isEditing, breadcrumb }">
      <HostHeader
        :title="entity.title"
        :lead="entity.lead"
        variant="plain"
        :is-editing
        :breadcrumb
      >
        <template #actions>
          <SearchField
            :label="$texts('header.search_label', 'Search the website')"
            :text
            large
            class="w-full"
          />
        </template>
      </HostHeader>
    </template>
    <SearchResults :text />
  </FrontendRoute>
</template>

<script lang="ts" setup>
// The search: the node's header with the search field, then the results. The
// node is assigned in Drupal's frontend_routing settings.
definePageMeta({
  name: 'search',
  path: '/search',
  languageMapping: { de: '/suche', fr: '/recherche' },
  drupalFrontendRoute: true,
  layout: 'drupal',
})

// The node assigned to the route, with its metatags.
const node = await useEditorialRoute()

const route = useRoute()

const text = computed(() =>
  typeof route.query.text === 'string' ? route.query.text.trim() : '',
)

await renderPageDependencies()
</script>
