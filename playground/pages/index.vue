<template>
  <BlokkliProvider
    v-if="page"
    entity-type="content"
    entity-bundle="page"
    :entity-uuid="page.uuid"
    :can-edit="true"
    language="en"
  >
    <BlokkliField v-bind="fieldHeader" tag="header" />
    <BlokkliField v-bind="fieldContent" />
    <BlokkliField v-bind="fieldFooter" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { mapMockField } from '@/app/mock/state'
import { entityStorageManager } from '~/app/mock/entityStorage'
import type { ContentPage } from '~/app/mock/state/Entity/Content'

const page = entityStorageManager.getContent<ContentPage>('1')

if (!page) {
  throw new Error('page not found')
}

const fieldHeader = computed(() => mapMockField(page.header()))
const fieldContent = computed(() => mapMockField(page.content()))
const fieldFooter = computed(() => mapMockField(page.footer()))
</script>
