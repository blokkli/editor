<template>
  <NodePage v-if="node" v-bind="node" />
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import { NodePage } from '#components'
import { getLanguageFromPath } from '#shared/languages'

const route = useRoute()

if (!getLanguageFromPath(route.path)) {
  throw createError({ statusCode: 404, fatal: true })
}

const { data, error } = await useAsyncGraphqlQuery(
  'route',
  computed(() => ({ path: route.path })),
)

if (error.value) {
  // 403: anonymous users, who can't see anything.
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
}

const node = computed(() => {
  const url = data.value?.data.route
  if (url && 'entity' in url && url.entity?.__typename === 'NodePage') {
    return url.entity
  }
  return null
})

if (!node.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
