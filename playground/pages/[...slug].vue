<template>
  <div v-if="page">
    <BlokkliProvider
      v-slot="{ entity, isEditing }"
      :key="language"
      entity-type="content"
      entity-bundle="page"
      :entity-uuid="page.uuid"
      :can-edit="true"
      :language="language"
      :entity="pageValues"
    >
      <Hero
        :is-editing="isEditing"
        :title="entity?.title"
        :lead="entity?.lead"
        :image="entity?.heroImage"
      >
        <BlokkliField
          name="buttons"
          :list="fieldButtons"
          list-class="mt-20 lg:mt-40 flex gap-10 flex-wrap"
          field-list-type="inline"
        />
        <template #animation>
          <BlokkliField
            name="icons"
            :list="fieldIcons"
            class="relative hero-animation"
          />
        </template>
      </Hero>
      <BlokkliField
        name="content"
        :list="fieldContent"
        :allowed-fragments="['cta']"
      />
    </BlokkliProvider>
  </div>
</template>

<script lang="ts" setup>
import { useRoute, computed } from '#imports'
import { mapMockField } from '@/app/mock/state'
import { entityStorageManager } from '~/app/mock/entityStorage'
import { ContentPage } from '~/app/mock/state/Entity/Content'
import Hero from '~/components/Hero/index.vue'

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

const uuid = computed(() => {
  if (route.path.includes('page/2')) {
    return '2'
  } else if (route.path.includes('page/3')) {
    return '3'
  }

  return '1'
})

const page = entityStorageManager.getContent(uuid.value)

if (!page) {
  throw new Error('Failed to load page with UUID: 1')
}

if (!(page instanceof ContentPage)) {
  throw new TypeError('Failed to load page with UUID: 1')
}

page.getTranslation(language.value)

const fieldButtons = computed(() => mapMockField(page.buttons()))
const fieldContent = computed(() => mapMockField(page.content()))
const fieldIcons = computed(() => mapMockField(page.icons()))
const pageValues = computed(() => page.getData())
</script>
