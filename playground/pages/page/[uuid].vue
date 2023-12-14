<template>
  <BlokkliProvider
    v-if="page"
    entity-type="content"
    entity-bundle="page"
    :entity-uuid="page.uuid"
    :can-edit="true"
  >
    <BlokkliField v-bind="fieldHeader" tag="header" />
    <BlokkliField v-bind="fieldContent" />
    <BlokkliField v-bind="fieldFooter" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { mapMockField, state } from '@/app/mock/state'
import { entityStorageManager } from '~/app/mock/entityStorage'

const route = useRoute()
const uuid = useParamString('uuid')
const page = entityStorageManager.getContent(uuid.value)

if (!page) {
  throw new Error('page not found')
}

const fieldHeader = computed(() => mapMockField(page.header()))
const fieldContent = computed(() => mapMockField(page.content()))
const fieldFooter = computed(() => mapMockField(page.footer()))
</script>
