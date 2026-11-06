<template>
  <NodeEditorial v-if="node" v-bind="node" front-page>
    <template #header="{ entity, isEditing, options }">
      <HomeHero
        :title="entity.title"
        :lead="entity.lead"
        :image="entity.hero"
        :variant="options.header"
        :is-editing
      />
    </template>
  </NodeEditorial>
</template>

<script lang="ts" setup>
// The front page: Drupal's front page (an editorial page) with a header of its
// own, with the search. Only its blocks can hold the fragments "today" and
// "quick_links". Every other path is [...slug].vue. Its metatags have no title:
// the layout's template makes it the site name.
definePageMeta({ layout: 'drupal' })

const node = await useEditorialRoute()

await renderPageDependencies()
</script>
