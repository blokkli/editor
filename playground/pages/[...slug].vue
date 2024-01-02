<template>
  <BlokkliProvider
    v-if="page"
    :key="language"
    entity-type="content"
    entity-bundle="page"
    :entity-uuid="page.uuid"
    :can-edit="true"
    :language="language"
  >
    <BlokkliField v-bind="fieldHeader" tag="header" />
    <BlokkliField v-bind="fieldContent" />
    <BlokkliField v-bind="fieldFooter" />
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import { mapMockField } from '@/app/mock/state'
import { entityStorageManager } from '~/app/mock/entityStorage'
import { ContentPage } from '~/app/mock/state/Entity/Content'

const route = useRoute()

const language = computed(() => {
  if (route.path.startsWith('/de')) {
    return 'de'
  } else if (route.path.startsWith('/fr')) {
    return 'fr'
  } else if (route.path.startsWith('/it')) {
    return 'it'
  }
  return 'en'
})

const page = entityStorageManager.getContent('1')

if (!page) {
  throw new Error('Failed to load page with UUID: 1')
}

if (!(page instanceof ContentPage)) {
  throw new Error('Failed to load page with UUID: 1')
}

page.getTranslation(language.value)

const fieldHeader = computed(() => mapMockField(page.header()))
const fieldContent = computed(() => mapMockField(page.content()))
const fieldFooter = computed(() => mapMockField(page.footer()))
</script>
