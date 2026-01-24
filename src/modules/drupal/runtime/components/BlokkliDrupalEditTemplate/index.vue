<template>
  <BlokkliProvider v-if="entity" v-bind="entity.blokkliProps">
    <BlokkliField name="paragraphs" :list="entity.items" />
  </BlokkliProvider>
</template>

<script setup lang="ts">
import { BlokkliProvider, BlokkliField } from '#components'
import { useGraphqlQuery, useAsyncData } from '#imports'

const props = defineProps<{
  /**
   * The UUID of the template.
   */
  uuid: string
}>()

const { data: entity } = await useAsyncData(
  'blokkli-drupal-edit-template-' + props.uuid,
  () => {
    return useGraphqlQuery('pbGetTemplateEntity', { uuid: props.uuid }).then(
      (v) => {
        if (v.data.paragraphsBlokkliTemplateGet) {
          return v.data.paragraphsBlokkliTemplateGet
        }
        return null
      },
    )
  },
)
</script>
