<template>
  <BlokkliProvider
    v-if="item"
    v-slot="{ entity }"
    v-bind="item.blokkliProps"
    :entity="item"
  >
    <div class="container-content py-8">
      <p class="text-sm text-stone-600">Library item</p>
      <h1 v-blokkli-editable:label class="text-3xl font-bold">
        {{ entity.libraryItemLabel }}
      </h1>
    </div>
    <BlokkliField name="paragraphs" :list="item.paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import { isLanguage } from '#shared/languages'

// The editor links here with the language prefix, e.g.
// /de/blokkli/library-item/<uuid>.
const route = useRoute()

if (!isLanguage(route.params.lang)) {
  throw createError({ statusCode: 404, fatal: true })
}

const { data, error } = await useAsyncGraphqlQuery('libraryItem', {
  uuid: String(route.params.uuid),
})

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
}

const item = computed(() => {
  const entity = data.value?.data.entity
  return entity && 'blokkliProps' in entity ? entity : null
})

if (!item.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
