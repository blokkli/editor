<template>
  <BlokkliProvider v-if="entity" v-bind="entity.blokkliProps">
    <BlokkliField name="paragraphs" :list="entity.items" />
  </BlokkliProvider>
</template>

<script setup lang="ts">
import { BlokkliProvider, BlokkliField } from '#components'
import { createError, useGraphqlQuery, useAsyncData } from '#imports'

const props = defineProps<{
  /**
   * The ID of the template, from its canonical URL: /blokkli/template/{id}.
   */
  id: string
}>()

const { data: entity } = await useAsyncData(
  'blokkli-drupal-edit-template-' + props.id,
  () => {
    return useGraphqlQuery('pbGetTemplateEntity', { id: props.id }).then(
      (v) => {
        if (v.data.paragraphsBlokkliTemplateGet) {
          return v.data.paragraphsBlokkliTemplateGet
        }
        return null
      },
    )
  },
)

if (!entity.value) {
  throw createError({ statusCode: 404, fatal: true })
}
</script>
