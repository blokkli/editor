<template>
  <BlokkliProvider
    v-if="item"
    v-slot="{ entity }"
    v-bind="item.blokkliProps"
    :entity="item"
  >
    <div class="container-content py-8">
      <p class="text-small text-muted">
        {{ $texts('library_item.label', 'Library item') }}
      </p>
      <h1 v-blokkli-editable:label class="font-serif text-h1">
        {{ entity.libraryItemLabel }}
      </h1>
    </div>
    <BlokkliField name="paragraphs" :list="item.paragraphs" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { computed, createError, useAsyncGraphqlQuery, useRoute } from '#imports'
import { BlokkliField, BlokkliProvider } from '#components'
import type { LibraryItemPageFragment } from '#graphql-operations'

// The editor links here with the uuid, e.g. /de/blokkli/library-item/<uuid>.
// Drupal's own links (open editing, the language switch, notifications) use
// the id: paragraphs_blokkli_library moves the canonical route to
// /blokkli/library-item/{id}.
const route = useRoute()

const param = String(route.params.uuid)
const byId = /^\d+$/.test(param)

const { data, error } = await useAsyncGraphqlQuery('libraryItem', {
  id: param,
  uuid: param,
  byId,
})

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, fatal: true })
}

const item = computed(() => {
  const entity = byId ? data.value?.data.byId : data.value?.data.byUuid
  return isLibraryItem(entity) ? entity : null
})

// The query returns an `Entity`, typed as the fragment or `object`.
function isLibraryItem(
  entity: object | undefined,
): entity is LibraryItemPageFragment {
  return !!entity && 'blokkliProps' in entity
}

if (!item.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
