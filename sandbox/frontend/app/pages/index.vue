<template>
  <NodeEditorial v-if="entity" v-bind="entity" front-page>
    <template #header="{ entity: node, isEditing, options }">
      <HomeHero
        :title="node.title"
        :lead="node.lead"
        :image="node.hero"
        :variant="options.header"
        :is-editing
      />
    </template>
  </NodeEditorial>
</template>

<script lang="ts" setup>
// The front page: Drupal's front page (an editorial page) with a header of its
// own, with the search. Only its blocks can hold the fragments "today" and
// "quick_links". Every other path is [...slug].vue.
definePageMeta({ layout: 'drupal' })

const route = useRoute()

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
  return url && 'entity' in url && url.entity?.__typename === 'NodeEditorial'
    ? url.entity
    : null
})

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
