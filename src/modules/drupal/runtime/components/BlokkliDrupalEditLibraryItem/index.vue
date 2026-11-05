<template>
  <BlokkliProvider
    v-if="item"
    v-slot="{ entity }"
    v-bind="item.blokkliProps"
    :entity="item"
  >
    <slot :entity />
    <BlokkliField name="paragraphs" :list="item.paragraphs" />
  </BlokkliProvider>
</template>

<script setup lang="ts">
import { BlokkliProvider, BlokkliField } from '#components'
import { createError, useGraphqlQuery, useAsyncData } from '#imports'
import type { PbGetLibraryItemEntityQuery } from '#graphql-operations'

type LibraryItem = NonNullable<
  PbGetLibraryItemEntityQuery['paragraphsBlokkliLibraryItemGet']
>

const props = defineProps<{
  /**
   * The ID of the library item, from its canonical URL:
   * /blokkli/library-item/{id}.
   */
  id: string
}>()

defineSlots<{
  /**
   * Rendered above the paragraphs, e.g. for the label. While editing, the
   * entity has the changes.
   */
  default?(props: { entity: LibraryItem }): unknown
}>()

const { data: item } = await useAsyncData(
  'blokkli-drupal-edit-library-item-' + props.id,
  () =>
    useGraphqlQuery('pbGetLibraryItemEntity', { id: props.id }).then(
      (v) => v.data.paragraphsBlokkliLibraryItemGet ?? null,
    ),
)

if (!item.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
