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
    <BlokkliField name="header" :list="fieldHeader" tag="header" />
    <BlokkliField name="content" :list="fieldContent" />
    <BlokkliField name="footer" :list="fieldFooter" v-slot="{ items }">
    </BlokkliField>
  </BlokkliProvider>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { useRoute, computed } from '#imports'
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

const mapItem = (item: FieldListItemTyped) => {
  if (item.bundle === 'image') {
    item.props.imageReference
  }
}

const getMenu = (items: FieldListItemTyped[]) => {}
</script>
